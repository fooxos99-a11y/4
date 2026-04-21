import { NextResponse } from "next/server"

import { requireRoles, ensureTeacherScope } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { getPlanForDate, groupPlansByStudent } from "@/lib/plan-history"
import { getOrCreateActiveSemester, isMissingSemestersTable, isNoActiveSemesterError } from "@/lib/semesters"
import { calculatePreviousMemorizedPages, resolvePlanReviewPagesForDate, resolvePlanReviewPoolPages } from "@/lib/quran-data"
import { isPassingMemorizationLevel, type EvaluationLevelValue } from "@/lib/student-attendance"
import { getStudyWeekStart, isStudyDay } from "@/lib/study-calendar"

export const dynamic = "force-dynamic"
export const revalidate = 0

type StudentRow = {
  id: string
  name: string | null
  halaqah: string | null
  id_number?: string | null
  account_number?: string | number | null
  points?: number | null
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

type EvaluationRecord = {
  hafiz_level?: EvaluationLevelValue
  tikrar_level?: EvaluationLevelValue
  samaa_level?: EvaluationLevelValue
  rabet_level?: EvaluationLevelValue
}

type AttendanceRow = {
  id: string
  student_id: string
  date: string
  status: string | null
  evaluations: EvaluationRecord[] | EvaluationRecord | null
}

type DailyReportRow = {
  student_id: string
  report_date: string
  memorization_done: boolean
  review_done: boolean
  linking_done: boolean
}

type DayStatus = "absent" | "late" | "present-only" | "memorized" | "review" | "tied" | "review-tied" | "complete" | "none"

type StudentCardData = {
  id: string
  name: string
  memorized: number
  revised: number
  tied: number
  presentCount: number
  absentCount: number
  memorizationCompletedCount: number
  reviewCompletedCount: number
  linkingCompletedCount: number
  tikrarCompletedCount: number
  statuses: Array<{ date: string; status: DayStatus }>
  totalActivity: number
}

function formatDateForQuery(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(value)
}

function getStudyWeek(weekOffset: number) {
  const start = getStudyWeekStart()
  start.setDate(start.getDate() - weekOffset * 7)

  const dates = Array.from({ length: 5 }, (_, offset) => {
    const date = new Date(start)
    date.setDate(start.getDate() + offset)
    return formatDateForQuery(date)
  })

  return {
    dates,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
  }
}

function getEvaluationRecord(value: AttendanceRow["evaluations"]): EvaluationRecord {
  if (Array.isArray(value)) {
    return value[0] ?? {}
  }

  return value ?? {}
}

function hasPassingMemorization(record?: AttendanceRow) {
  if (!record || (record.status !== "present" && record.status !== "late")) {
    return false
  }

  const evaluation = getEvaluationRecord(record.evaluations)
  return isPassingMemorizationLevel(evaluation.hafiz_level ?? null)
}

function hasPassingTikrar(record?: AttendanceRow) {
  if (!record || (record.status !== "present" && record.status !== "late")) {
    return false
  }

  const evaluation = getEvaluationRecord(record.evaluations)
  return isPassingMemorizationLevel(evaluation.tikrar_level ?? null)
}

function getReadableErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === "string" && error.trim()) {
    return error
  }

  if (error && typeof error === "object") {
    const candidate = error as {
      message?: unknown
      error?: unknown
      details?: unknown
      hint?: unknown
      code?: unknown
    }

    const parts = [candidate.message, candidate.error, candidate.details, candidate.hint, candidate.code]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)

    if (parts.length > 0) {
      return parts.join(" - ")
    }
  }

  return "حدث خطأ غير معروف أثناء تحميل البيانات"
}

function isMissingDailyReportsTable(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as { code?: unknown; message?: unknown }
  return candidate.code === "PGRST205" && typeof candidate.message === "string" && candidate.message.includes("student_daily_reports")
}

function getDailyCompletionFlags(record?: AttendanceRow, dailyReport?: DailyReportRow) {
  const evaluation = record ? getEvaluationRecord(record.evaluations) : {}

  return {
    memorizationDone: Boolean(dailyReport?.memorization_done) || hasPassingMemorization(record),
    reviewDone: Boolean(dailyReport?.review_done) || isPassingMemorizationLevel(evaluation.samaa_level ?? null),
    linkingDone: Boolean(dailyReport?.linking_done) || isPassingMemorizationLevel(evaluation.rabet_level ?? null),
  }
}

function getDayStatus(record?: AttendanceRow, dailyReport?: DailyReportRow): DayStatus {
  if (record?.status === "absent" || record?.status === "excused") {
    return "absent"
  }

  const { reviewDone, linkingDone } = getDailyCompletionFlags(record, dailyReport)
  const passedMemorization = hasPassingMemorization(record)

  if (passedMemorization) {
    return reviewDone || linkingDone ? "complete" : "memorized"
  }

  if (reviewDone && linkingDone) {
    return "review-tied"
  }

  if (reviewDone) {
    return "review"
  }

  if (linkingDone) {
    return "tied"
  }

  if (record?.status === "late") {
    return "late"
  }

  if (record?.status === "present") {
    return "present-only"
  }

  return "none"
}

export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const { searchParams } = new URL(request.url)
    const circleName = String(searchParams.get("circle") || "").trim()
    const weekOffset = Math.max(0, Number.parseInt(String(searchParams.get("weekOffset") || "0"), 10) || 0)

    if (!circleName) {
      return NextResponse.json({ error: "اسم الحلقة مطلوب" }, { status: 400 })
    }

    const teacherScopeError = ensureTeacherScope(session, circleName)
    if (teacherScopeError) {
      return teacherScopeError
    }

    const supabase = createAdminClient()
    const studyWeek = getStudyWeek(weekOffset)
    const studyDates = studyWeek.dates
    const previousWeek = getStudyWeek(weekOffset + 1)
    let activeSemesterId: string | null = null

    try {
      const activeSemester = await getOrCreateActiveSemester(supabase)
      activeSemesterId = activeSemester.id
    } catch (semesterError) {
      if (isNoActiveSemesterError(semesterError)) {
        return NextResponse.json({
          students: [],
          hasPreviousWeek: false,
          error: "لا يوجد فصل نشط حاليًا. ابدأ فصلًا جديدًا لعرض التقرير الأسبوعي.",
        })
      }

      if (!isMissingSemestersTable(semesterError)) {
        throw semesterError
      }
    }

    const studentsResult = await supabase
      .from("students")
      .select("id, name, halaqah, id_number, account_number, points")
      .eq("halaqah", circleName)
      .order("points", { ascending: false })

    if (studentsResult.error) {
      throw studentsResult.error
    }

    const studentRows = (studentsResult.data ?? []) as StudentRow[]
    const studentIds = studentRows.map((student) => student.id).filter(Boolean)

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [], hasPreviousWeek: false, error: "" })
    }

    let plansQuery = supabase
      .from("student_plans")
      .select("id, student_id, start_date, created_at, daily_pages, muraajaa_pages, rabt_pages, review_distribution_mode, muraajaa_mode, weekly_muraajaa_min_daily_pages, weekly_muraajaa_start_day, weekly_muraajaa_end_day, has_previous, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, previous_memorization_ranges, completed_juzs")
      .in("student_id", studentIds)

    let attendanceRangeQuery = supabase
      .from("attendance_records")
      .select(`
        id,
        student_id,
        date,
        status,
        evaluations (hafiz_level, tikrar_level, samaa_level, rabet_level)
      `)
      .eq("halaqah", circleName)
      .gte("date", studyWeek.startDate)
      .lte("date", studyWeek.endDate)

    let previousWeekAttendanceQuery = supabase
      .from("attendance_records")
      .select("id", { count: "exact", head: true })
      .eq("halaqah", circleName)
      .gte("date", previousWeek.startDate)
      .lte("date", previousWeek.endDate)

    if (activeSemesterId) {
      plansQuery = plansQuery.eq("semester_id", activeSemesterId)
      attendanceRangeQuery = attendanceRangeQuery.eq("semester_id", activeSemesterId)
      previousWeekAttendanceQuery = previousWeekAttendanceQuery.eq("semester_id", activeSemesterId)
    }

    const [plansResult, attendanceResult, previousWeekAttendanceResult] = await Promise.all([
      plansQuery,
      attendanceRangeQuery,
      previousWeekAttendanceQuery,
    ])

    if (plansResult.error) {
      throw plansResult.error
    }

    if (attendanceResult.error) {
      throw attendanceResult.error
    }

    if (previousWeekAttendanceResult.error) {
      throw previousWeekAttendanceResult.error
    }

    const plans = (plansResult.data ?? []) as PlanRow[]
    const attendanceRows = ((attendanceResult.data ?? []) as AttendanceRow[]).filter((record) => studyDates.includes(record.date))
    let dailyReports: DailyReportRow[] = []
    let previousWeekReportsCount = 0

    const [dailyReportsResult, previousWeekReportsResult] = await Promise.all([
      supabase
        .from("student_daily_reports")
        .select("student_id, report_date, memorization_done, review_done, linking_done")
        .in("student_id", studentIds)
        .gte("report_date", studyWeek.startDate)
        .lte("report_date", studyWeek.endDate),
      supabase
        .from("student_daily_reports")
        .select("student_id", { count: "exact", head: true })
        .in("student_id", studentIds)
        .gte("report_date", previousWeek.startDate)
        .lte("report_date", previousWeek.endDate),
    ])

    const dailyReportsTableMissing = isMissingDailyReportsTable(dailyReportsResult.error) || isMissingDailyReportsTable(previousWeekReportsResult.error)

    if (!dailyReportsTableMissing) {
      if (dailyReportsResult.error) {
        throw dailyReportsResult.error
      }

      if (previousWeekReportsResult.error) {
        throw previousWeekReportsResult.error
      }

      dailyReports = ((dailyReportsResult.data ?? []) as DailyReportRow[]).filter((report) => studyDates.includes(report.report_date))
      previousWeekReportsCount = previousWeekReportsResult.count ?? 0
    }

    const plansByStudent = groupPlansByStudent(plans)
    const attendanceByStudent = new Map<string, Map<string, AttendanceRow>>()
    const dailyReportsByStudent = new Map<string, Map<string, DailyReportRow>>()

    for (const record of attendanceRows) {
      const byDate = attendanceByStudent.get(record.student_id) ?? new Map<string, AttendanceRow>()
      byDate.set(record.date, record)
      attendanceByStudent.set(record.student_id, byDate)
    }

    for (const report of dailyReports) {
      const byDate = dailyReportsByStudent.get(report.student_id) ?? new Map<string, DailyReportRow>()
      byDate.set(report.report_date, report)
      dailyReportsByStudent.set(report.student_id, byDate)
    }

    const cardRows = studentRows
      .map((student) => {
        const studentPlans = plansByStudent.get(student.id) || []
        const byDate = attendanceByStudent.get(student.id) ?? new Map<string, AttendanceRow>()
        const reportsByDate = dailyReportsByStudent.get(student.id) ?? new Map<string, DailyReportRow>()
        let memorized = 0
        let revised = 0
        let tied = 0
        let presentCount = 0
        let absentCount = 0
        let memorizationCompletedCount = 0
        let reviewCompletedCount = 0
        let linkingCompletedCount = 0
        let tikrarCompletedCount = 0
        let memorizedPoolPages = 0
        let activePlanId: string | null = null

        const statuses = studyDates.map((date) => {
          const plan = getPlanForDate(studentPlans, date)
          const record = byDate.get(date)
          const dailyReport = reportsByDate.get(date)
          const status = getDayStatus(record, dailyReport)
          const { memorizationDone, reviewDone, linkingDone } = getDailyCompletionFlags(record, dailyReport)
          const priorReviewCompletedCount = reviewCompletedCount

          if (plan?.id && plan.id !== activePlanId) {
            memorizedPoolPages = Math.max(memorizedPoolPages, calculatePreviousMemorizedPages(plan))
            activePlanId = plan.id
          }

          if (record?.status === "present" || record?.status === "late") {
            presentCount += 1
          }

          if (record?.status === "absent" || record?.status === "excused") {
            absentCount += 1
          }

          if (memorizationDone) {
            memorizationCompletedCount += 1
          }

          if (plan) {
            const reviewPoolPages = resolvePlanReviewPoolPages(plan, memorizedPoolPages)
            const reviewPages = resolvePlanReviewPagesForDate(plan, reviewPoolPages, priorReviewCompletedCount, date)
            const tiePages = Math.min(Number(plan.rabt_pages ?? 10), Math.max(0, memorizedPoolPages))

            if (reviewDone) {
              revised += reviewPages
            }

            if (linkingDone) {
              tied += tiePages
            }

            if (hasPassingMemorization(record)) {
              const dailyPages = Number(plan.daily_pages ?? 1)
              memorized += dailyPages
              memorizedPoolPages += dailyPages
            }
          }

          if (reviewDone) {
            reviewCompletedCount += 1
          }

          if (linkingDone) {
            linkingCompletedCount += 1
          }

          if (hasPassingTikrar(record)) {
            tikrarCompletedCount += 1
          }

          return { date, status }
        })

        const totalActivity = memorized + revised + tied

        return {
          id: student.id,
          name: student.name?.trim() || "طالب غير معرف",
          memorized,
          revised,
          tied,
          presentCount,
          absentCount,
          memorizationCompletedCount,
          reviewCompletedCount,
          linkingCompletedCount,
          tikrarCompletedCount,
          statuses,
          totalActivity,
        } satisfies StudentCardData
      })
      .sort((left, right) => {
        if (right.totalActivity !== left.totalActivity) {
          return right.totalActivity - left.totalActivity
        }

        if (right.presentCount !== left.presentCount) {
          return right.presentCount - left.presentCount
        }

        return left.name.localeCompare(right.name, "ar")
      })

    return NextResponse.json({
      students: cardRows,
      hasPreviousWeek: (previousWeekAttendanceResult.count ?? 0) > 0 || previousWeekReportsCount > 0,
      error: "",
    })
  } catch (error) {
    return NextResponse.json({
      students: [],
      hasPreviousWeek: false,
      error: `تعذر تحميل بيانات الحلقة: ${getReadableErrorMessage(error)}`,
    }, { status: 500 })
  }
}