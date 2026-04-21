import { NextRequest, NextResponse } from "next/server"

import { requireRoles } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOrCreateActiveSemester, isMissingSemestersTable, isNoActiveSemesterError } from "@/lib/semesters"
import { getStudyWeekEnd, getStudyWeekStart, isStudyDay } from "@/lib/study-calendar"
import { getPlanForDate, groupPlansByStudent } from "@/lib/plan-history"
import { calculatePreviousMemorizedPages, resolvePlanReviewPagesForDate, resolvePlanReviewPoolPages } from "@/lib/quran-data"
import { applyAttendancePointsAdjustment, calculateTotalEvaluationPoints, isPassingMemorizationLevel } from "@/lib/student-attendance"

type DateFilter = "today" | "currentWeek" | "currentMonth" | "all" | "custom"

type CustomDateRange = {
  start: string
  end: string
}

type StudentRow = {
  id: string
  name: string | null
  halaqah?: string | null
}

type CircleRow = {
  id: string
  name: string | null
}

type PlanRow = {
  id: string
  student_id: string
  start_date: string | null
  created_at: string | null
  daily_pages: number | null
  muraajaa_pages: number | null
  rabt_pages: number | null
  review_distribution_mode?: "fixed" | "weekly" | null
  muraajaa_mode?: "daily_fixed" | "weekly_distributed" | null
  weekly_muraajaa_min_daily_pages?: number | null
  weekly_muraajaa_start_day?: number | null
  weekly_muraajaa_end_day?: number | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  previous_memorization_ranges?: unknown[] | null
  completed_juzs?: number[] | null
}

type DailyReportRow = {
  student_id: string
  report_date: string
  memorization_done: boolean
  review_done: boolean
  linking_done: boolean
}

type EvaluationRecord = {
  hafiz_level?: string | null
  tikrar_level?: string | null
  samaa_level?: string | null
  rabet_level?: string | null
}

type AttendanceRow = {
  id: string
  student_id: string
  halaqah: string | null
  date: string
  status: string | null
  evaluations: EvaluationRecord[] | EvaluationRecord | null
}

type StudentSummary = {
  id: string
  name: string
  circleName: string
  memorized: number
  revised: number
  tied: number
  maxPoints: number
  earnedPoints: number
  percent: number
}

type CircleSummary = {
  name: string
  memorized: number
  revised: number
  tied: number
  passedReviewSegments: number
  passedTiedSegments: number
  passedMemorizationSegments: number
  passedTikrarSegments: number
  plannedStudentsCount: number
  expectedRecords: number
  maxPoints: number
  earnedPoints: number
  totalAttend: number
  totalRecords: number
  evalPercent: number
  attendPercent: number
  memorizedPercent: number
  tikrarPercent: number
  revisedPercent: number
  tiedPercent: number
  score: number
}

const TEXT = {
  unknownStudent: "طالب غير معرف",
  unknownCircle: "حلقة غير معرفة",
  loadError: "تعذر تحميل الإحصائيات",
} as const

const MAX_EVALUATION_POINTS_PER_STUDY_DAY = 40

function getReadableErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === "string" && error.trim()) {
    return error
  }

  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; error?: unknown; details?: unknown; hint?: unknown; code?: unknown }
    const parts = [candidate.message, candidate.error, candidate.details, candidate.hint, candidate.code]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)

    if (parts.length > 0) {
      return parts.join(" - ")
    }
  }

  return "حدث خطأ غير معروف أثناء تحميل البيانات"
}

function formatDateForQuery(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(value)
}

function countStudyDaysInRange(start: Date, end: Date) {
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)

  const normalizedEnd = new Date(end)
  normalizedEnd.setHours(0, 0, 0, 0)

  let count = 0
  while (cursor <= normalizedEnd) {
    if (isStudyDay(cursor)) {
      count += 1
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return count
}

function getDateRange(filter: DateFilter, customRange: CustomDateRange) {
  const end = new Date()
  const start = new Date()

  if (filter === "today") {
    return { start: new Date(start.setHours(0, 0, 0, 0)), end }
  }

  if (filter === "currentWeek") {
    return { start: getStudyWeekStart(), end: getStudyWeekEnd() }
  }

  if (filter === "currentMonth") {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    return { start, end }
  }

  if (filter === "custom") {
    return {
      start: new Date(`${customRange.start}T00:00:00`),
      end: new Date(`${customRange.end}T23:59:59`),
    }
  }

  start.setFullYear(2020, 0, 1)
  return { start, end }
}

function getEvaluationRecord(value: AttendanceRow["evaluations"]): EvaluationRecord {
  if (Array.isArray(value)) {
    return value[0] ?? {}
  }

  return value ?? {}
}

function getDailyCompletionFlags(record?: AttendanceRow, dailyReport?: DailyReportRow) {
  const evaluation = record ? getEvaluationRecord(record.evaluations) : {}

  return {
    memorizationDone: Boolean(dailyReport?.memorization_done) || isPassingMemorizationLevel(evaluation.hafiz_level ?? null),
    reviewDone: Boolean(dailyReport?.review_done) || isPassingMemorizationLevel(evaluation.samaa_level ?? null),
    linkingDone: Boolean(dailyReport?.linking_done) || isPassingMemorizationLevel(evaluation.rabet_level ?? null),
  }
}

function createStudentSummary(id: string, name: string, circleName: string): StudentSummary {
  return { id, name, circleName, memorized: 0, revised: 0, tied: 0, maxPoints: 0, earnedPoints: 0, percent: 0 }
}

function createCircleSummary(name: string): CircleSummary {
  return {
    name,
    memorized: 0,
    revised: 0,
    tied: 0,
    passedReviewSegments: 0,
    passedTiedSegments: 0,
    passedMemorizationSegments: 0,
    passedTikrarSegments: 0,
    plannedStudentsCount: 0,
    expectedRecords: 0,
    maxPoints: 0,
    earnedPoints: 0,
    totalAttend: 0,
    totalRecords: 0,
    evalPercent: 0,
    attendPercent: 0,
    memorizedPercent: 0,
    tikrarPercent: 0,
    revisedPercent: 0,
    tiedPercent: 0,
    score: 0,
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const filter = (request.nextUrl.searchParams.get("filter") || "today") as DateFilter
    const customRange: CustomDateRange = {
      start: request.nextUrl.searchParams.get("start") || formatDateForQuery(new Date()),
      end: request.nextUrl.searchParams.get("end") || formatDateForQuery(new Date()),
    }

    const supabase = createAdminClient()
    const { start, end } = getDateRange(filter, customRange)
    let activeSemesterId: string | null = null
    let activeSemesterStartDate: Date | null = null

    try {
      const activeSemester = await getOrCreateActiveSemester(supabase)
      activeSemesterId = activeSemester.id
      activeSemesterStartDate = activeSemester.start_date ? new Date(`${activeSemester.start_date}T00:00:00`) : null
    } catch (semesterError) {
      if (isNoActiveSemesterError(semesterError)) {
        return NextResponse.json({
          counts: { circles: 0, students: 0 },
          totals: { memorized: 0, revised: 0, tied: 0 },
          topMemorizers: [],
          topRevisers: [],
          topTied: [],
          topCircles: [],
          allCircles: [],
          error: "لا يوجد فصل نشط حاليًا. ابدأ فصلًا جديدًا لعرض الإحصائيات الحالية.",
        })
      }

      if (!isMissingSemestersTable(semesterError)) {
        throw semesterError
      }
    }

    let plansQuery = supabase.from("student_plans").select("id, student_id, start_date, created_at, daily_pages, muraajaa_pages, rabt_pages, has_previous, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, previous_memorization_ranges")
    if (activeSemesterId) {
      plansQuery = plansQuery.eq("semester_id", activeSemesterId)
    }

    let dailyReportsQuery = supabase
      .from("student_daily_reports")
      .select("student_id, report_date, memorization_done, review_done, linking_done")

    const [studentsResult, circlesResult, plansResult] = await Promise.all([
      supabase.from("students").select("id, name, halaqah"),
      supabase.from("circles").select("id, name"),
      plansQuery,
    ])

    if (studentsResult.error) throw studentsResult.error
    if (circlesResult.error) throw circlesResult.error
    if (plansResult.error) throw plansResult.error

    let attendanceQuery = supabase.from("attendance_records").select(`
      id,
      student_id,
      halaqah,
      date,
      status,
      evaluations (hafiz_level, tikrar_level, samaa_level, rabet_level)
    `)

    if (activeSemesterId) {
      attendanceQuery = attendanceQuery.eq("semester_id", activeSemesterId)
    }

    if (filter !== "all") {
      attendanceQuery = attendanceQuery.gte("date", formatDateForQuery(start)).lte("date", formatDateForQuery(end))
      dailyReportsQuery = dailyReportsQuery.gte("report_date", formatDateForQuery(start)).lte("report_date", formatDateForQuery(end))
    }

    const [attendanceResult, dailyReportsResult] = await Promise.all([attendanceQuery, dailyReportsQuery])
    if (attendanceResult.error) throw attendanceResult.error

    const dailyReportsTableMissing = dailyReportsResult.error?.code === "PGRST205" && String(dailyReportsResult.error.message || "").includes("student_daily_reports")
    if (dailyReportsResult.error && !dailyReportsTableMissing) {
      throw dailyReportsResult.error
    }

    const students = (studentsResult.data ?? []) as StudentRow[]
    const circles = (circlesResult.data ?? []) as CircleRow[]
    const plans = (plansResult.data ?? []) as PlanRow[]
    const dailyReports = (dailyReportsResult.data ?? []) as DailyReportRow[]
    const plansByStudent = groupPlansByStudent(plans)
    const plannedStudentIds = new Set(Array.from(plansByStudent.keys()))
    const attendance = ((attendanceResult.data ?? []) as AttendanceRow[]).filter(
      (record) => isStudyDay(record.date) && plannedStudentIds.has(record.student_id),
    )
    const studyDayCount = filter === "all"
      ? countStudyDaysInRange(activeSemesterStartDate ?? start, end)
      : countStudyDaysInRange(start, end)

    const allCircles = [...circles].sort((left, right) => (left.name || "").localeCompare(right.name || "", "ar"))
    const studentNames = new Map(students.map((student) => [student.id, student.name?.trim() || TEXT.unknownStudent]))
    const studentCircles = new Map(students.map((student) => [student.id, student.halaqah?.trim() || TEXT.unknownCircle]))
    const studentStats = new Map<string, StudentSummary>()
    const circleStats = new Map<string, CircleSummary>()
    const dailyReportsByStudentDate = new Map<string, DailyReportRow>()
    const memorizedPoolByStudent = new Map<string, number>()
    const activePlanIdByStudent = new Map<string, string>()
    const reviewCompletedByStudent = new Map<string, number>()

    for (const report of dailyReports) {
      dailyReportsByStudentDate.set(`${report.student_id}|${report.report_date}`, report)
    }

    for (const studentId of plannedStudentIds) {
      const circleName = studentCircles.get(studentId) ?? TEXT.unknownCircle
      if (circleName === TEXT.unknownCircle) continue
      const circleSummary = circleStats.get(circleName) ?? createCircleSummary(circleName)
      circleSummary.plannedStudentsCount += 1
      circleStats.set(circleName, circleSummary)
    }

    for (const circleSummary of circleStats.values()) {
      circleSummary.expectedRecords = circleSummary.plannedStudentsCount * studyDayCount
      circleSummary.maxPoints = circleSummary.expectedRecords * MAX_EVALUATION_POINTS_PER_STUDY_DAY
    }

    let memorizedTotal = 0
    let revisedTotal = 0
    let tiedTotal = 0

    const sortedAttendance = [...attendance].sort((left, right) => {
      if (left.student_id !== right.student_id) {
        return left.student_id.localeCompare(right.student_id)
      }
      return left.date.localeCompare(right.date)
    })

    for (const record of sortedAttendance) {
      const studentId = record.student_id
      const studentPlans = plansByStudent.get(studentId) || []
      const plan = getPlanForDate(studentPlans, record.date)
      const circleName = record.halaqah?.trim() || studentCircles.get(studentId) || TEXT.unknownCircle
      if (!plan) continue

      const studentName = studentNames.get(studentId) ?? TEXT.unknownStudent
      const studentSummary = studentStats.get(studentId) ?? createStudentSummary(studentId, studentName, circleName)
      studentStats.set(studentId, studentSummary)
      if (studentSummary.circleName === TEXT.unknownCircle && circleName !== TEXT.unknownCircle) {
        studentSummary.circleName = circleName
      }

      if (circleName === TEXT.unknownCircle) continue
      const circleSummary = circleStats.get(circleName) ?? createCircleSummary(circleName)
      circleStats.set(circleName, circleSummary)

      const dailyPages = Number(plan?.daily_pages ?? 1)
      const status = record.status ?? ""
      const isPresent = status === "present" || status === "late"
      const dailyReport = dailyReportsByStudentDate.get(`${studentId}|${record.date}`)
      const { reviewDone, linkingDone } = getDailyCompletionFlags(record, dailyReport)
      const activePlanId = activePlanIdByStudent.get(studentId)
      const nextPlanBasePages = calculatePreviousMemorizedPages(plan)
      const memorizedPoolPages = !memorizedPoolByStudent.has(studentId) || activePlanId !== plan.id
        ? Math.max(memorizedPoolByStudent.get(studentId) ?? 0, nextPlanBasePages)
        : (memorizedPoolByStudent.get(studentId) ?? 0)
      activePlanIdByStudent.set(studentId, plan.id)
      const reviewPoolPages = resolvePlanReviewPoolPages(plan, memorizedPoolPages)
      const reviewPages = resolvePlanReviewPagesForDate(plan, reviewPoolPages, reviewCompletedByStudent.get(studentId) ?? 0, record.date)
      const tiePages = Math.min(Number(plan?.rabt_pages ?? 10), Math.max(0, memorizedPoolPages))

      studentSummary.maxPoints += MAX_EVALUATION_POINTS_PER_STUDY_DAY
      circleSummary.totalRecords += 1

      if (!isPresent) continue
      circleSummary.totalAttend += 1
      const evaluation = getEvaluationRecord(record.evaluations)

      if (isPassingMemorizationLevel(evaluation.hafiz_level ?? null)) {
        circleSummary.passedMemorizationSegments += 1
        studentSummary.memorized += dailyPages
        circleSummary.memorized += dailyPages
        memorizedTotal += dailyPages
      }

      if (isPassingMemorizationLevel(evaluation.tikrar_level ?? null)) {
        circleSummary.passedTikrarSegments += 1
      }

      if (reviewDone) {
        circleSummary.passedReviewSegments += 1
        studentSummary.revised += reviewPages
        circleSummary.revised += reviewPages
        revisedTotal += reviewPages
        reviewCompletedByStudent.set(studentId, (reviewCompletedByStudent.get(studentId) ?? 0) + 1)
      }

      if (linkingDone) {
        circleSummary.passedTiedSegments += 1
        studentSummary.tied += tiePages
        circleSummary.tied += tiePages
        tiedTotal += tiePages
      }

      if (isPassingMemorizationLevel(evaluation.hafiz_level ?? null)) {
        memorizedPoolByStudent.set(studentId, memorizedPoolPages + dailyPages)
      }

      const earnedPoints = applyAttendancePointsAdjustment(calculateTotalEvaluationPoints(evaluation), status)
      studentSummary.earnedPoints += earnedPoints
      circleSummary.earnedPoints += earnedPoints
    }

    const studentArray = Array.from(studentStats.values()).map((item) => ({
      ...item,
      percent: item.maxPoints > 0 ? (item.earnedPoints / item.maxPoints) * 100 : 0,
    }))

    const circleArray = Array.from(circleStats.values())
      .filter((item) => item.name !== TEXT.unknownCircle && item.expectedRecords > 0)
      .map((item) => {
        const evalPercent = item.maxPoints > 0 ? (item.earnedPoints / item.maxPoints) * 100 : 0
        const attendPercent = item.expectedRecords > 0 ? (item.totalAttend / item.expectedRecords) * 100 : 0
        const memorizedPercent = item.expectedRecords > 0 ? (item.passedMemorizationSegments / item.expectedRecords) * 100 : 0
        const tikrarPercent = item.expectedRecords > 0 ? (item.passedTikrarSegments / item.expectedRecords) * 100 : 0
        const revisedPercent = item.expectedRecords > 0 ? (item.passedReviewSegments / item.expectedRecords) * 100 : 0
        const tiedPercent = item.expectedRecords > 0 ? (item.passedTiedSegments / item.expectedRecords) * 100 : 0
        const score = evalPercent * 0.6 + attendPercent * 0.4

        return {
          ...item,
          evalPercent,
          attendPercent,
          memorizedPercent,
          tikrarPercent,
          revisedPercent,
          tiedPercent,
          score,
        }
      })

    return NextResponse.json({
      counts: { circles: circles.length, students: students.length },
      totals: { memorized: memorizedTotal, revised: revisedTotal, tied: tiedTotal },
      topMemorizers: [...studentArray].sort((left, right) => right.memorized - left.memorized).slice(0, 5),
      topRevisers: [...studentArray].sort((left, right) => right.revised - left.revised).slice(0, 5),
      topTied: [...studentArray].sort((left, right) => right.tied - left.tied).slice(0, 5),
      topCircles: [...circleArray].sort((left, right) => right.score - left.score).slice(0, 5),
      allCircles,
      error: "",
    })
  } catch (error) {
    const message = getReadableErrorMessage(error)
    return NextResponse.json({
      counts: { circles: 0, students: 0 },
      totals: { memorized: 0, revised: 0, tied: 0 },
      topMemorizers: [],
      topRevisers: [],
      topTied: [],
      topCircles: [],
      allCircles: [],
      error: `${TEXT.loadError}: ${message}`,
    })
  }
}