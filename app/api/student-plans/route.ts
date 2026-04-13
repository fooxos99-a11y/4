import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { ensureStudentAccess, requireRoles } from "@/lib/auth/guards"
import {
  SURAHS,
  TOTAL_MUSHAF_PAGES,
  calculatePreviousMemorizedPages,
  getContiguousCompletedJuzRange,
  getAdjustedPlanPreviewRange,
  getStoredMemorizedRanges,
  getLegacyPreviousMemorizationFields,
  getJuzBounds,
  getJuzNumbersForPageRange,
  getPreviousMemorizationBoundary,
  getNextAyahReference,
  getNormalizedCompletedJuzs,
  getPendingMasteryJuzs,
  hasScatteredCompletedJuzs,
  normalizePreviousMemorizationRanges,
  getPageFloatForAyah,
  resolvePlanTotalDays,
  resolvePlanTotalPages,
} from "@/lib/quran-data"
import { getScheduledSessionProgress } from "@/lib/plan-progress"
import { getSaudiDateString } from "@/lib/saudi-time"
import { buildWeeklyReviewPlan, type ReviewMode } from "@/lib/weekly-review"
import { isEvaluatedAttendance } from "@/lib/student-attendance"
import { getOrCreateActiveSemester, isMissingSemestersTable, isNoActiveSemesterError } from "@/lib/semesters"
import { normalizeHafizExtraPages } from "@/lib/hafiz-extra"

export const dynamic = "force-dynamic"
export const revalidate = 0

type StudentPlanSummaryPayload = {
  plan: any | null
  completedDays: number
  completedSessionIndices?: number[]
  reviewCompletedDays: number
  progressPercent: number
  hafizExtraPages: number
  quranMemorizedPages: number
  quranProgressPercent: number
  quranLevel: number
  attendanceRecords?: any[]
  completedRecords?: any[]
}

type HafizExtraRecord = {
  student_id?: string | null
  attendance_date?: string | null
  extra_pages?: number | null
}

type StudentMemorizationSnapshot = {
  completed_juzs?: number[] | null
  current_juzs?: number[] | null
  memorized_start_surah?: number | null
  memorized_start_verse?: number | null
  memorized_end_surah?: number | null
  memorized_end_verse?: number | null
  memorized_ranges?: any[] | null
}

type PlanMemorizationFallback = {
  completed_juzs?: number[] | null
  current_juzs?: number[] | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  previous_memorization_ranges?: any[] | null
}

const ADVANCING_MEMORIZATION_LEVELS = ["excellent", "good", "very_good"]

function isMissingStudentHafizExtrasTable(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || error || "")
  return /student_hafiz_extras/i.test(message) && /does not exist|not exist|relation|table/i.test(message)
}

function getStudentHafizExtraPages(extraRows: HafizExtraRecord[] = [], startDate?: string | null) {
  return extraRows.reduce((sum, row) => {
    if (startDate && row.attendance_date && String(row.attendance_date) < String(startDate)) {
      return sum
    }

    return sum + (normalizeHafizExtraPages(row.extra_pages) || 0)
  }, 0)
}

function normalizePlanSurahNames<T extends {
  start_surah_number?: number | null
  end_surah_number?: number | null
  start_surah_name?: string | null
  end_surah_name?: string | null
}>(plan: T): T {
  const startSurahName = plan.start_surah_number
    ? SURAHS.find((surah) => surah.number === Number(plan.start_surah_number))?.name
    : null
  const endSurahName = plan.end_surah_number
    ? SURAHS.find((surah) => surah.number === Number(plan.end_surah_number))?.name
    : null

  return {
    ...plan,
    start_surah_name: startSurahName || plan.start_surah_name,
    end_surah_name: endSurahName || plan.end_surah_name,
  }
}

function hasCompletedMemorization(record: any) {
  if (!isEvaluatedAttendance(record.status)) return false

  const evaluations = Array.isArray(record.evaluations)
    ? record.evaluations
    : record.evaluations
      ? [record.evaluations]
      : []

  if (evaluations.length === 0) return false

  const latestEvaluation = evaluations[evaluations.length - 1]
  return ADVANCING_MEMORIZATION_LEVELS.includes(latestEvaluation?.hafiz_level ?? "")
}

function hasCompletedReview(record: any) {
  if (!isEvaluatedAttendance(record.status)) return false

  const evaluations = Array.isArray(record.evaluations)
    ? record.evaluations
    : record.evaluations
      ? [record.evaluations]
      : []

  if (evaluations.length === 0) return false

  const latestEvaluation = evaluations[evaluations.length - 1]
  return ADVANCING_MEMORIZATION_LEVELS.includes(latestEvaluation?.samaa_level ?? "")
}

function getScheduledStudyDates(startDate: string, maxSessions: number, endDate = getSaudiDateString()) {
  const scheduledDates: string[] = []
  const currentDate = new Date(startDate)
  const lastDate = new Date(endDate)

  while (currentDate <= lastDate && scheduledDates.length < maxSessions) {
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      scheduledDates.push(currentDate.toISOString().split("T")[0])
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return scheduledDates
}

function getExpectedNextStart(prevStartSurah?: number | null, prevEndSurah?: number | null, prevEndVerse?: number | null) {
  if (!prevStartSurah || !prevEndSurah || !prevEndVerse) {
    return null
  }

  const previousEndSurahData = SURAHS.find((surah) => surah.number === prevEndSurah)
  if (!previousEndSurahData) return null

  const isDescending = prevStartSurah > prevEndSurah

  if (!isDescending) {
    if (prevEndVerse < previousEndSurahData.verseCount) {
      return { surahNumber: prevEndSurah, verseNumber: prevEndVerse + 1 }
    }

    const nextSurah = SURAHS.find((surah) => surah.number === prevEndSurah + 1)
    return nextSurah ? { surahNumber: nextSurah.number, verseNumber: 1 } : null
  }

  if (prevEndVerse > 1) {
    return { surahNumber: prevEndSurah, verseNumber: prevEndVerse - 1 }
  }

  const previousSurah = SURAHS.find((surah) => surah.number === prevEndSurah - 1)
  return previousSurah
    ? { surahNumber: previousSurah.number, verseNumber: previousSurah.verseCount }
    : null
}

function compareAyahRefs(
  leftSurahNumber: number,
  leftVerseNumber: number,
  rightSurahNumber: number,
  rightVerseNumber: number,
) {
  if (leftSurahNumber !== rightSurahNumber) {
    return leftSurahNumber - rightSurahNumber
  }

  return leftVerseNumber - rightVerseNumber
}

function isStartAllowedAfterPrevious(
  startSurahNumber: number,
  startVerseNumber: number,
  boundarySurahNumber: number,
  boundaryVerseNumber: number,
  previousDirection: "asc" | "desc",
) {
  const comparison = compareAyahRefs(startSurahNumber, startVerseNumber, boundarySurahNumber, boundaryVerseNumber)
  return previousDirection === "desc" ? comparison <= 0 : comparison >= 0
}

function isAyahWithinRange(
  surahNumber: number,
  verseNumber: number,
  rangeStartSurahNumber: number,
  rangeStartVerseNumber: number,
  rangeEndSurahNumber: number,
  rangeEndVerseNumber: number,
) {
  const isAscendingRange = compareAyahRefs(
    rangeStartSurahNumber,
    rangeStartVerseNumber,
    rangeEndSurahNumber,
    rangeEndVerseNumber,
  ) <= 0

  const normalizedRangeStart = isAscendingRange
    ? { surahNumber: rangeStartSurahNumber, verseNumber: rangeStartVerseNumber }
    : { surahNumber: rangeEndSurahNumber, verseNumber: rangeEndVerseNumber }
  const normalizedRangeEnd = isAscendingRange
    ? { surahNumber: rangeEndSurahNumber, verseNumber: rangeEndVerseNumber }
    : { surahNumber: rangeStartSurahNumber, verseNumber: rangeStartVerseNumber }

  return compareAyahRefs(surahNumber, verseNumber, normalizedRangeStart.surahNumber, normalizedRangeStart.verseNumber) >= 0
    && compareAyahRefs(surahNumber, verseNumber, normalizedRangeEnd.surahNumber, normalizedRangeEnd.verseNumber) <= 0
}

function rangesOverlap(
  left: { startSurahNumber: number; startVerseNumber: number; endSurahNumber: number; endVerseNumber: number },
  right: { startSurahNumber: number; startVerseNumber: number; endSurahNumber: number; endVerseNumber: number },
) {
  const leftStartsBeforeRightEnds = compareAyahRefs(
    left.startSurahNumber,
    left.startVerseNumber,
    right.endSurahNumber,
    right.endVerseNumber,
  ) <= 0
  const rightStartsBeforeLeftEnds = compareAyahRefs(
    right.startSurahNumber,
    right.startVerseNumber,
    left.endSurahNumber,
    left.endVerseNumber,
  ) <= 0

  return leftStartsBeforeRightEnds && rightStartsBeforeLeftEnds
}

function parseRawPreviousRange(range: any) {
  if (!range || typeof range !== "object") return null

  const startSurahNumber = Number(range.startSurahNumber ?? range.start_surah_number)
  const startVerseNumber = Number(range.startVerseNumber ?? range.start_verse_number ?? range.startVerse ?? range.start_verse) || 1
  const endSurahNumber = Number(range.endSurahNumber ?? range.end_surah_number)
  const endVerseNumber = Number(range.endVerseNumber ?? range.end_verse_number ?? range.endVerse ?? range.end_verse)

  if (!Number.isInteger(startSurahNumber) || !Number.isInteger(endSurahNumber) || !Number.isInteger(startVerseNumber) || !Number.isInteger(endVerseNumber)) {
    return null
  }

  const normalizedStartIsBeforeEnd = compareAyahRefs(startSurahNumber, startVerseNumber, endSurahNumber, endVerseNumber) <= 0
  return normalizedStartIsBeforeEnd
    ? { startSurahNumber, startVerseNumber, endSurahNumber, endVerseNumber }
    : { startSurahNumber: endSurahNumber, startVerseNumber: endVerseNumber, endSurahNumber: startSurahNumber, endVerseNumber: startVerseNumber }
}

function resolveSurahNumber(value: unknown) {
  const trimmedValue = String(value || "").trim()
  if (!trimmedValue) return null

  const numericValue = Number(trimmedValue)
  if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 114) {
    return numericValue
  }

  return SURAHS.find((surah) => surah.name === trimmedValue)?.number || null
}

function isMissingStudentExamsTable(error: unknown) {
  const message = String((error as { message?: string } | null)?.message || error || "")
  return /student_exams/i.test(message) && /does not exist|not exist|relation|table/i.test(message)
}

function mergePassedExamJuzsIntoSnapshot(
  studentData: StudentMemorizationSnapshot | null | undefined,
  passedExamJuzs?: number[],
): StudentMemorizationSnapshot | null | undefined {
  if (!studentData && (!passedExamJuzs || passedExamJuzs.length === 0)) {
    return studentData
  }

  const nextCompletedJuzs = Array.from(new Set([
    ...getNormalizedCompletedJuzs(studentData?.completed_juzs),
    ...(passedExamJuzs || []).filter((juzNumber) => Number.isInteger(juzNumber) && juzNumber >= 1 && juzNumber <= 30),
  ])).sort((left, right) => left - right)

  const completedRange = hasScatteredCompletedJuzs(nextCompletedJuzs)
    ? null
    : getContiguousCompletedJuzRange(nextCompletedJuzs)

  return {
    ...studentData,
    completed_juzs: nextCompletedJuzs,
    current_juzs: getPendingMasteryJuzs(studentData?.current_juzs, nextCompletedJuzs),
    memorized_start_surah: studentData?.memorized_start_surah || completedRange?.startSurahNumber || null,
    memorized_start_verse: studentData?.memorized_start_verse || completedRange?.startVerseNumber || null,
    memorized_end_surah: studentData?.memorized_end_surah || completedRange?.endSurahNumber || null,
    memorized_end_verse: studentData?.memorized_end_verse || completedRange?.endVerseNumber || null,
  }
}

async function getPassedExamJuzsByStudentIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  semesterId: string,
  studentIds: string[],
) {
  const passedExamJuzsByStudentId = new Map<string, number[]>()

  if (studentIds.length === 0) {
    return passedExamJuzsByStudentId
  }

  const { data: passedExams, error } = await supabase
    .from("student_exams")
    .select("student_id, juz_number")
    .eq("semester_id", semesterId)
    .eq("passed", true)
    .in("student_id", studentIds)

  if (error) {
    if (!isMissingStudentExamsTable(error)) {
      throw error
    }

    return passedExamJuzsByStudentId
  }

  for (const exam of passedExams || []) {
    const studentId = String(exam.student_id || "")
    const juzNumber = Number(exam.juz_number)
    if (!studentId || !Number.isInteger(juzNumber)) {
      continue
    }

    const existing = passedExamJuzsByStudentId.get(studentId) || []
    existing.push(juzNumber)
    passedExamJuzsByStudentId.set(studentId, existing)
  }

  return passedExamJuzsByStudentId
}

function calculateStoredStudentMemorizationProgress(studentData: StudentMemorizationSnapshot | null | undefined) {
  const memorizedPages = Math.min(TOTAL_MUSHAF_PAGES, calculatePreviousMemorizedPages({
    has_previous: Boolean(
      studentData?.memorized_start_surah ||
      studentData?.memorized_end_surah ||
      (Array.isArray(studentData?.memorized_ranges) && studentData.memorized_ranges.length > 0) ||
      (studentData?.completed_juzs?.length || 0) > 0,
    ),
    prev_start_surah: studentData?.memorized_start_surah,
    prev_start_verse: studentData?.memorized_start_verse,
    prev_end_surah: studentData?.memorized_end_surah,
    prev_end_verse: studentData?.memorized_end_verse,
    previous_memorization_ranges: studentData?.memorized_ranges,
    completed_juzs: studentData?.completed_juzs,
  }))

  const progressPercent = Math.max(0, Math.min(100, (memorizedPages / TOTAL_MUSHAF_PAGES) * 100))
  const level = Math.max(0, Math.min(100, Math.round(progressPercent)))

  return {
    memorizedPages,
    progressPercent,
    level,
  }
}

function buildEffectiveMemorizationSnapshot(
  studentData: StudentMemorizationSnapshot | null | undefined,
  rawPlan: PlanMemorizationFallback | null | undefined,
): StudentMemorizationSnapshot {
  const studentRanges = normalizePreviousMemorizationRanges(studentData?.memorized_ranges)
  const planRanges = normalizePreviousMemorizationRanges(rawPlan?.previous_memorization_ranges)
  const effectiveRanges = studentRanges.length > 0 ? studentRanges : planRanges

  const normalizedCompletedJuzs = getNormalizedCompletedJuzs(
    (studentData?.completed_juzs?.length || 0) > 0 ? studentData?.completed_juzs : rawPlan?.completed_juzs,
  )
  const pendingMasteryJuzs = getPendingMasteryJuzs(
    (studentData?.current_juzs?.length || 0) > 0 ? studentData?.current_juzs : rawPlan?.current_juzs,
    normalizedCompletedJuzs,
  )
  const completedJuzRange = hasScatteredCompletedJuzs(normalizedCompletedJuzs)
    ? null
    : getContiguousCompletedJuzRange(normalizedCompletedJuzs)

  const rangeBoundary = getPreviousMemorizationBoundary(effectiveRanges)

  return {
    completed_juzs: normalizedCompletedJuzs,
    current_juzs: pendingMasteryJuzs,
    memorized_start_surah: studentData?.memorized_start_surah || rangeBoundary?.startSurahNumber || rawPlan?.prev_start_surah || completedJuzRange?.startSurahNumber || null,
    memorized_start_verse: studentData?.memorized_start_verse || rangeBoundary?.startVerseNumber || rawPlan?.prev_start_verse || completedJuzRange?.startVerseNumber || null,
    memorized_end_surah: studentData?.memorized_end_surah || rangeBoundary?.endSurahNumber || rawPlan?.prev_end_surah || completedJuzRange?.endSurahNumber || null,
    memorized_end_verse: studentData?.memorized_end_verse || rangeBoundary?.endVerseNumber || rawPlan?.prev_end_verse || completedJuzRange?.endVerseNumber || null,
    memorized_ranges: effectiveRanges.length > 0 ? effectiveRanges : null,
  }
}

function getAttendanceMemorizedRanges(records: any[]) {
  return normalizePreviousMemorizationRanges(
    (records || []).flatMap((record) => {
      if (!hasCompletedMemorization(record)) {
        return []
      }

      const evaluations = Array.isArray(record.evaluations)
        ? record.evaluations
        : record.evaluations
          ? [record.evaluations]
          : []
      const latestEvaluation = evaluations[evaluations.length - 1]
      const startSurahNumber = resolveSurahNumber(latestEvaluation?.hafiz_from_surah)
      const startVerseNumber = Number(latestEvaluation?.hafiz_from_verse) || 1
      const endSurahNumber = resolveSurahNumber(latestEvaluation?.hafiz_to_surah)
      const endVerseNumber = Number(latestEvaluation?.hafiz_to_verse) || null

      if (!startSurahNumber || !endSurahNumber || !Number.isInteger(startVerseNumber) || !Number.isInteger(endVerseNumber)) {
        return []
      }

      return [{
        startSurahNumber,
        startVerseNumber,
        endSurahNumber,
        endVerseNumber,
      }]
    }),
  )
}

function buildStudentPlanSummary(
  studentData: StudentMemorizationSnapshot | null | undefined,
  rawPlan: any | null | undefined,
  attendanceRecords: any[] = [],
  includeAttendanceDetails = true,
  hafizExtraRows: HafizExtraRecord[] = [],
): StudentPlanSummaryPayload {
  const effectiveStudentData = buildEffectiveMemorizationSnapshot(studentData, rawPlan)
  const normalizedCompletedJuzs = effectiveStudentData.completed_juzs || []
  const pendingMasteryJuzs = getPendingMasteryJuzs(effectiveStudentData.current_juzs, normalizedCompletedJuzs)
  const storedQuranMemorization = calculateStoredStudentMemorizationProgress(effectiveStudentData)

  if (!rawPlan) {
    return {
      plan: null,
      completedDays: 0,
      reviewCompletedDays: 0,
      progressPercent: 0,
      hafizExtraPages: 0,
      quranMemorizedPages: storedQuranMemorization.memorizedPages,
      quranProgressPercent: storedQuranMemorization.progressPercent,
      quranLevel: storedQuranMemorization.level,
      ...(includeAttendanceDetails ? { attendanceRecords: [], completedRecords: [], completedSessionIndices: [] } : {}),
    }
  }

  const normalizedRawPlan = normalizePlanSurahNames(rawPlan)
  const plan = {
    ...normalizedRawPlan,
    completed_juzs: normalizedCompletedJuzs,
    current_juzs: pendingMasteryJuzs,
    total_pages: resolvePlanTotalPages({
      ...normalizedRawPlan,
      completed_juzs: normalizedCompletedJuzs,
    }),
    total_days: resolvePlanTotalDays({
      ...normalizedRawPlan,
      completed_juzs: normalizedCompletedJuzs,
    }),
  }

  const filteredAttendanceRecords = plan.start_date
    ? attendanceRecords.filter((record) => !record?.date || String(record.date) >= String(plan.start_date))
    : attendanceRecords

  const scheduledDates = plan.start_date
    ? getScheduledStudyDates(plan.start_date, plan.total_days || 0)
    : []

  const passingRecords = filteredAttendanceRecords.filter(hasCompletedMemorization)
  const sessionProgress = getScheduledSessionProgress(passingRecords, scheduledDates)
  const completedDays = sessionProgress.completedDays
  const completedRecords = sessionProgress.completedRecords
  const completedSessionIndices = sessionProgress.completedSessionIndices
  const reviewCompletedDays = filteredAttendanceRecords.filter(hasCompletedReview).length
  const hafizExtraPages = Math.min(
    Number(plan.total_pages) || 0,
    getStudentHafizExtraPages(hafizExtraRows, plan.start_date),
  )
  const baseCompletedPages = Math.min(
    Number(plan.total_pages) || 0,
    completedDays * (Number(plan.daily_pages) || 0),
  )
  const effectiveCompletedPages = Math.min(Number(plan.total_pages) || 0, baseCompletedPages + hafizExtraPages)
  const progressPercent = Number(plan.total_pages) > 0
    ? Math.min(Math.round((effectiveCompletedPages / Number(plan.total_pages)) * 100), 100)
    : 0
  return {
    plan,
    completedDays,
    reviewCompletedDays,
    progressPercent,
    hafizExtraPages,
    quranMemorizedPages: storedQuranMemorization.memorizedPages,
    quranProgressPercent: storedQuranMemorization.progressPercent,
    quranLevel: storedQuranMemorization.level,
    ...(includeAttendanceDetails
      ? { attendanceRecords: filteredAttendanceRecords, completedRecords, completedSessionIndices }
      : {}),
  }
}

// GET - جلب خطط طالب معين أو جلب كل الخطط
export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["student", "teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
    const activeSemester = await getOrCreateActiveSemester(supabase)
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id")
    const studentIdsParam = searchParams.get("student_ids")
    const planId = searchParams.get("plan_id")

    if (planId) {
      const { data, error } = await supabase
        .from("student_plans")
        .select("*")
        .eq("id", planId)
        .single()
      if (error) throw error

      const planStudentId = String(data?.student_id || "")
      if (!planStudentId) {
        return NextResponse.json({ error: "الخطة غير موجودة" }, { status: 404 })
      }

      const studentAccess = await ensureStudentAccess(supabase, session, planStudentId)
      if ("response" in studentAccess) {
        return studentAccess.response
      }

      return NextResponse.json({ plan: normalizePlanSurahNames(data) })
    }

    if (studentIdsParam) {
      if (session.role === "student") {
        return NextResponse.json({ error: "الجلب الدفعي غير متاح لحسابات الطلاب" }, { status: 403 })
      }

      const requestedStudentIds = Array.from(new Set(
        studentIdsParam
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ))

      if (requestedStudentIds.length === 0) {
        return NextResponse.json({ plansByStudent: {} })
      }

      let studentsQuery = supabase
        .from("students")
        .select("id, halaqah, completed_juzs, current_juzs, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse, memorized_ranges")
        .in("id", requestedStudentIds)

      if (session.role === "teacher" || session.role === "deputy_teacher") {
        studentsQuery = studentsQuery.eq("halaqah", session.halaqah || "")
      }

      const [{ data: studentRows, error: studentsError }, { data: planRows, error: plansError }, { data: attendanceRows, error: attendanceError }, hafizExtraResult] = await Promise.all([
        studentsQuery,
        supabase
          .from("student_plans")
          .select("*")
          .in("student_id", requestedStudentIds)
          .eq("semester_id", activeSemester.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("attendance_records")
          .select("student_id, id, date, status, is_compensation, created_at, evaluations(hafiz_level, tikrar_level, samaa_level, rabet_level)")
          .in("student_id", requestedStudentIds)
          .eq("semester_id", activeSemester.id)
          .order("date", { ascending: true }),
        supabase
          .from("student_hafiz_extras")
          .select("student_id, attendance_date, extra_pages")
          .in("student_id", requestedStudentIds)
          .eq("semester_id", activeSemester.id),
      ])

      if (studentsError) throw studentsError
      if (plansError) throw plansError
      if (attendanceError) throw attendanceError

      const hafizExtraRows = hafizExtraResult.error
        ? (() => {
            if (isMissingStudentHafizExtrasTable(hafizExtraResult.error)) {
              return [] as HafizExtraRecord[]
            }

            throw hafizExtraResult.error
          })()
        : (hafizExtraResult.data || [])

      const passedExamJuzsByStudentId = await getPassedExamJuzsByStudentIds(supabase, activeSemester.id, requestedStudentIds)

      const accessibleStudents = studentRows || []
      if ((session.role === "teacher" || session.role === "deputy_teacher") && accessibleStudents.length !== requestedStudentIds.length) {
        return NextResponse.json({ error: "بعض الطلاب لا يتبعون حلقتك أو غير موجودين" }, { status: 403 })
      }

      const studentMap = new Map(accessibleStudents.map((student) => [
        String(student.id),
        mergePassedExamJuzsIntoSnapshot(student, passedExamJuzsByStudentId.get(String(student.id))),
      ]))
      const latestPlanByStudent = new Map<string, any>()
      for (const plan of planRows || []) {
        const key = String(plan.student_id)
        if (!latestPlanByStudent.has(key)) {
          latestPlanByStudent.set(key, plan)
        }
      }

      const attendanceByStudent = new Map<string, any[]>()
      for (const attendanceRecord of attendanceRows || []) {
        const key = String(attendanceRecord.student_id)
        const existing = attendanceByStudent.get(key)
        if (existing) {
          existing.push(attendanceRecord)
        } else {
          attendanceByStudent.set(key, [attendanceRecord])
        }
      }

      const hafizExtrasByStudent = new Map<string, HafizExtraRecord[]>()
      for (const extraRow of hafizExtraRows) {
        const key = String(extraRow.student_id || "")
        if (!key) continue

        const existing = hafizExtrasByStudent.get(key)
        if (existing) {
          existing.push(extraRow)
        } else {
          hafizExtrasByStudent.set(key, [extraRow])
        }
      }

      const plansByStudent = Object.fromEntries(
        requestedStudentIds.map((requestedId) => {
          const studentRecord = studentMap.get(String(requestedId))
          return [
            requestedId,
            buildStudentPlanSummary(
              studentRecord,
              latestPlanByStudent.get(String(requestedId)) || null,
              attendanceByStudent.get(String(requestedId)) || [],
              false,
              hafizExtrasByStudent.get(String(requestedId)) || [],
            ),
          ]
        }),
      )

      return NextResponse.json({ plansByStudent })
    }

    if (studentId) {
      const studentAccess = await ensureStudentAccess(supabase, session, studentId)
      if ("response" in studentAccess) {
        return studentAccess.response
      }

      const { data: studentData } = await supabase
        .from("students")
        .select("completed_juzs, current_juzs, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse, memorized_ranges")
        .eq("id", studentId)
        .maybeSingle()

      const passedExamJuzsByStudentId = await getPassedExamJuzsByStudentIds(supabase, activeSemester.id, [studentId])
      const effectiveStudentData = mergePassedExamJuzsIntoSnapshot(studentData, passedExamJuzsByStudentId.get(studentId))

      // جلب الخطة مع عدد الأيام المكتملة
      const { data: plans, error } = await supabase
        .from("student_plans")
        .select("*")
        .eq("student_id", studentId)
        .eq("semester_id", activeSemester.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      if (!plans || plans.length === 0) {
        return NextResponse.json(buildStudentPlanSummary(effectiveStudentData, null, [], true))
      }

      const rawPlan = plans[0]

      const { data: hafizExtraRows, error: hafizExtraError } = await supabase
        .from("student_hafiz_extras")
        .select("student_id, attendance_date, extra_pages")
        .eq("student_id", studentId)
        .eq("semester_id", activeSemester.id)

      // جلب سجلات الحضور مع تقييماتها (join مع evaluations)
      let attQuery = supabase
        .from("attendance_records")
        .select("id, date, status, is_compensation, created_at, evaluations(hafiz_level, tikrar_level, samaa_level, rabet_level)")
        .eq("student_id", studentId)
        .eq("semester_id", activeSemester.id)
        .order("date", { ascending: true })

      if (rawPlan.start_date) {
        attQuery = attQuery.gte("date", rawPlan.start_date)
      }

      const { data: attendanceRecords, error: attError } = await attQuery

      if (hafizExtraError && !isMissingStudentHafizExtrasTable(hafizExtraError)) {
        throw hafizExtraError
      }

      if (attError) {
        console.error("[plans] attendance query error:", attError)
        return NextResponse.json(buildStudentPlanSummary(effectiveStudentData, rawPlan, [], true, hafizExtraRows || []))
      }

      return NextResponse.json(buildStudentPlanSummary(effectiveStudentData, rawPlan, attendanceRecords || [], true, hafizExtraRows || []))
    }

    return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 })
  } catch (error) {
    console.error("[plans] GET error:", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ error: "لا يوجد فصل نشط حاليًا." }, { status: 409 })
    }
    if (isMissingSemestersTable(error)) {
      return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
    }
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

// POST - إنشاء خطة جديدة للطالب
export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
    const activeSemester = await getOrCreateActiveSemester(supabase)
    const body = await request.json()
    const {
      student_id,
      start_surah_number,
      start_surah_name,
      start_verse,
      end_surah_number,
      end_surah_name,
      end_verse,
      daily_pages, // 0.5 | 1 | 2
      start_date,
      direction,
      total_days: totalDaysOverride,
      has_previous,
      prev_start_surah,
      prev_start_verse,
      prev_end_surah,
      prev_end_verse,
      previous_memorization_ranges,
      muraajaa_pages,
      rabt_pages,
      muraajaa_mode,
      weekly_muraajaa_total_pages,
      weekly_muraajaa_min_daily_pages,
      weekly_muraajaa_start_day,
      weekly_muraajaa_end_day,
    } = body

    const normalizedMuraajaaMode: ReviewMode = muraajaa_mode === "weekly_distributed" ? "weekly_distributed" : "daily_fixed"
    const weeklyReviewPlan = normalizedMuraajaaMode === "weekly_distributed"
      ? buildWeeklyReviewPlan({
          totalPages: Number(weekly_muraajaa_total_pages),
          minDailyPages: Number(weekly_muraajaa_min_daily_pages),
          startDay: Number(weekly_muraajaa_start_day),
          endDay: Number(weekly_muraajaa_end_day),
        })
      : null

    const { data: studentMemorizedData } = await supabase
      .from("students")
      .select("memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse, memorized_ranges, completed_juzs, current_juzs")
      .eq("id", student_id)
      .maybeSingle()

    const normalizedCompletedJuzs = getNormalizedCompletedJuzs(studentMemorizedData?.completed_juzs)
    const pendingMasteryJuzs = getPendingMasteryJuzs(studentMemorizedData?.current_juzs, normalizedCompletedJuzs)
    const completedJuzRange = hasScatteredCompletedJuzs(normalizedCompletedJuzs)
      ? null
      : getContiguousCompletedJuzRange(normalizedCompletedJuzs)
    const rawSubmittedPreviousRanges = Array.isArray(previous_memorization_ranges)
      ? previous_memorization_ranges
          .map((range) => parseRawPreviousRange(range))
          .filter((range): range is NonNullable<ReturnType<typeof parseRawPreviousRange>> => Boolean(range))
      : []
    const submittedPreviousRanges = normalizePreviousMemorizationRanges(previous_memorization_ranges)
    const storedPreviousRanges = normalizePreviousMemorizationRanges(studentMemorizedData?.memorized_ranges)
    const effectivePreviousRanges = submittedPreviousRanges.length > 0 ? submittedPreviousRanges : storedPreviousRanges
    const previousBoundary = rawSubmittedPreviousRanges.length === 1
      ? rawSubmittedPreviousRanges[0]
      : getPreviousMemorizationBoundary(effectivePreviousRanges)

    const overlappingPreviousRanges = rawSubmittedPreviousRanges.some((range, index) => (
      rawSubmittedPreviousRanges.slice(index + 1).some((otherRange) => rangesOverlap(range, otherRange))
    ))
    if (overlappingPreviousRanges) {
      return NextResponse.json({ error: "لا يمكن تكرار أو تداخل المحفوظ السابق بين البطاقات" }, { status: 400 })
    }

    const effectiveHasPrevious =
      effectivePreviousRanges.length > 0 ||
      Boolean(has_previous) ||
      Boolean(
        (studentMemorizedData?.memorized_start_surah && studentMemorizedData?.memorized_end_surah) ||
        completedJuzRange ||
        normalizedCompletedJuzs.length > 0,
      )

    const effectivePrevStartSurah = previousBoundary?.startSurahNumber || prev_start_surah || studentMemorizedData?.memorized_start_surah || completedJuzRange?.startSurahNumber || null
    const effectivePrevStartVerse = previousBoundary?.startVerseNumber || prev_start_verse || studentMemorizedData?.memorized_start_verse || completedJuzRange?.startVerseNumber || null
    const effectivePrevEndSurah = previousBoundary?.endSurahNumber || prev_end_surah || studentMemorizedData?.memorized_end_surah || completedJuzRange?.endSurahNumber || null
    const effectivePrevEndVerse = previousBoundary?.endVerseNumber || prev_end_verse || studentMemorizedData?.memorized_end_verse || completedJuzRange?.endVerseNumber || null

    if (!student_id || !start_surah_number || !end_surah_number || !daily_pages) {
      return NextResponse.json({ error: "البيانات المطلوبة ناقصة" }, { status: 400 })
    }

    if (normalizedMuraajaaMode === "weekly_distributed") {
      if (
        !Number.isFinite(Number(weekly_muraajaa_min_daily_pages)) || Number(weekly_muraajaa_min_daily_pages) <= 0 ||
        !Number.isInteger(Number(weekly_muraajaa_start_day)) || !Number.isInteger(Number(weekly_muraajaa_end_day)) ||
        !weeklyReviewPlan || weeklyReviewPlan.dayIndices.length === 0
      ) {
        return NextResponse.json({ error: "بيانات التقسيم الأسبوعي للمراجعة غير مكتملة" }, { status: 400 })
      }
    }

    const studentAccess = await ensureStudentAccess(supabase, session, student_id)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const { data: memorizationAttendance, error: memorizationAttendanceError } = await supabase
      .from("attendance_records")
      .select("id, status, evaluations(hafiz_level, hafiz_from_surah, hafiz_from_verse, hafiz_to_surah, hafiz_to_verse)")
      .eq("student_id", student_id)
      .eq("semester_id", activeSemester.id)

    if (memorizationAttendanceError) {
      throw memorizationAttendanceError
    }

    const attendanceMemorizedRanges = getAttendanceMemorizedRanges(memorizationAttendance || [])
    if (attendanceMemorizedRanges.length > 0) {
      const persistedStudentRanges = getStoredMemorizedRanges(studentMemorizedData || {})
      const nextStudentRanges = getStoredMemorizedRanges({
        memorized_ranges: [...persistedStudentRanges, ...attendanceMemorizedRanges],
      })

      if (JSON.stringify(nextStudentRanges) !== JSON.stringify(persistedStudentRanges)) {
        const legacyFields = getLegacyPreviousMemorizationFields(nextStudentRanges)
        const { error: persistStudentMemorizationError } = await supabase
          .from("students")
          .update({
            memorized_start_surah: legacyFields.prev_start_surah,
            memorized_start_verse: legacyFields.prev_start_verse,
            memorized_end_surah: legacyFields.prev_end_surah,
            memorized_end_verse: legacyFields.prev_end_verse,
            memorized_ranges: nextStudentRanges.length > 0 ? nextStudentRanges : null,
          })
          .eq("id", student_id)

        if (persistStudentMemorizationError) {
          console.error("[plans] Failed to persist attendance memorization onto student:", persistStudentMemorizationError)
        }
      }
    }

    const effectiveBlockedRanges = normalizePreviousMemorizationRanges([
      ...effectivePreviousRanges,
      ...attendanceMemorizedRanges,
    ])

    const normalizedDirection = direction || (Number(start_surah_number) > Number(end_surah_number) ? "desc" : "asc")
    let adjustedStartSurahNumber = Number(start_surah_number)
    let adjustedStartVerse = Number(start_verse) || 1
    let adjustedPlanMessage: string | null = null

    const startSurahData = SURAHS.find((surah) => surah.number === adjustedStartSurahNumber)
    const endSurahData = SURAHS.find((surah) => surah.number === Number(end_surah_number))

    if (!startSurahData || !endSurahData) {
      return NextResponse.json({ error: "تعذر تحديد السور المطلوبة" }, { status: 400 })
    }

    const selectedStartPage = getPageFloatForAyah(adjustedStartSurahNumber, adjustedStartVerse)
    const selectedEndAyah = Number(end_verse) || endSurahData.verseCount
    const nextSelectedEndAyah = getNextAyahReference(Number(end_surah_number), selectedEndAyah)
    const selectedEndPage = nextSelectedEndAyah
      ? getPageFloatForAyah(nextSelectedEndAyah.surah, nextSelectedEndAyah.ayah)
      : 605
    const selectedJuzs = getJuzNumbersForPageRange(selectedStartPage, selectedEndPage, normalizedDirection)
    const completedJuzSet = new Set<number>((studentMemorizedData?.completed_juzs || []).filter((juzNumber: number) => Number.isInteger(juzNumber)))
    const overlappingJuzs = selectedJuzs.filter((juzNumber) => completedJuzSet.has(juzNumber))

    if (overlappingJuzs.length > 0) {
      const leadingCompletedJuzs: number[] = []

      for (const juzNumber of selectedJuzs) {
        if (!completedJuzSet.has(juzNumber)) {
          break
        }

        leadingCompletedJuzs.push(juzNumber)
      }

      if (leadingCompletedJuzs.length === selectedJuzs.length) {
        return NextResponse.json({ error: "النطاق المختار محفوظ بالكامل ضمن الأجزاء الناجحة للطالب" }, { status: 400 })
      }

      if (leadingCompletedJuzs.length > 0) {
        const nextJuzNumber = selectedJuzs[leadingCompletedJuzs.length]
        const nextJuzBounds = getJuzBounds(nextJuzNumber)

        if (!nextJuzBounds) {
          return NextResponse.json({ error: "تعذر تحديد بداية النطاق بعد تجاوز الأجزاء الناجحة" }, { status: 400 })
        }

        if (normalizedDirection === "desc") {
          adjustedStartSurahNumber = nextJuzBounds.endSurahNumber
          adjustedStartVerse = nextJuzBounds.endVerseNumber
        } else {
          adjustedStartSurahNumber = nextJuzBounds.startSurahNumber
          adjustedStartVerse = nextJuzBounds.startVerseNumber
        }

        adjustedPlanMessage = `تم تجاوز الأجزاء الناجحة في بداية النطاق تلقائيًا: ${leadingCompletedJuzs.join("، ")}`
      }
    }

    const adjustedPreview = getAdjustedPlanPreviewRange({
      startSurahNumber: adjustedStartSurahNumber,
      startVerseNumber: adjustedStartVerse,
      endSurahNumber: Number(end_surah_number),
      endVerseNumber: Number(end_verse) || endSurahData.verseCount,
      dailyPages: Number(daily_pages) || 0,
      direction: normalizedDirection,
      previousMemorizationRanges: effectiveBlockedRanges,
      completedJuzs: normalizedCompletedJuzs,
    })

    if (adjustedPreview.totalPages <= 0) {
      return NextResponse.json({ error: "النطاق المختار محفوظ بالكامل ضمن المحفوظ السابق أو الأجزاء الناجحة للطالب" }, { status: 400 })
    }

    if (
      adjustedPreview.startSurahNumber !== adjustedStartSurahNumber
      || adjustedPreview.startVerseNumber !== adjustedStartVerse
    ) {
      const adjustedStartSurah = SURAHS.find((surah) => surah.number === adjustedPreview.startSurahNumber)
      const overlapsDailyEvaluation = attendanceMemorizedRanges.some((range) => (
        isAyahWithinRange(
          adjustedStartSurahNumber,
          adjustedStartVerse,
          range.startSurahNumber,
          range.startVerseNumber,
          range.endSurahNumber,
          range.endVerseNumber,
        )
      ))

      adjustedStartSurahNumber = adjustedPreview.startSurahNumber
      adjustedStartVerse = adjustedPreview.startVerseNumber
      adjustedPlanMessage = overlapsDailyEvaluation
        ? `تم تجاوز المقطع المثبت في التقييم اليومي تلقائياً، وبداية الخطة أصبحت من ${adjustedStartSurah?.name || "السورة"} آية ${adjustedStartVerse}`
        : `تم تجاوز المحفوظ السابق تلقائياً، وبداية الخطة أصبحت من ${adjustedStartSurah?.name || "السورة"} آية ${adjustedStartVerse}`
    }

    const totalPages = resolvePlanTotalPages({
      start_surah_number: adjustedStartSurahNumber,
      start_verse: adjustedStartVerse,
      end_surah_number,
      end_verse,
      direction: normalizedDirection,
      has_previous: effectiveHasPrevious,
      prev_start_surah: effectivePrevStartSurah,
      prev_start_verse: effectivePrevStartVerse,
      prev_end_surah: effectivePrevEndSurah,
      prev_end_verse: effectivePrevEndVerse,
      previous_memorization_ranges: effectivePreviousRanges.length > 0 ? effectivePreviousRanges : null,
      completed_juzs: normalizedCompletedJuzs,
    })
    const totalDays = resolvePlanTotalDays({
      start_surah_number: adjustedStartSurahNumber,
      start_verse: adjustedStartVerse,
      end_surah_number,
      end_verse,
      total_pages: totalPages,
      daily_pages,
      direction: normalizedDirection,
      has_previous: effectiveHasPrevious,
      prev_start_surah: effectivePrevStartSurah,
      prev_start_verse: effectivePrevStartVerse,
      prev_end_surah: effectivePrevEndSurah,
      prev_end_verse: effectivePrevEndVerse,
      previous_memorization_ranges: effectivePreviousRanges.length > 0 ? effectivePreviousRanges : null,
      completed_juzs: normalizedCompletedJuzs,
    })
    const persistedTotalPages = Math.max(0, Math.ceil(Number(totalPages) || 0))

    const { data: existingPlans, error: existingPlansError } = await supabase
      .from("student_plans")
      .select("id, start_date, start_surah_number, start_verse, end_surah_number, end_verse, daily_pages, direction")
      .eq("student_id", student_id)
      .eq("semester_id", activeSemester.id)
      .order("created_at", { ascending: false })

    if (existingPlansError) {
      throw existingPlansError
    }

    const effectiveMuraajaaPages = normalizedMuraajaaMode === "weekly_distributed"
      ? (weeklyReviewPlan?.dailyTargetPages && weeklyReviewPlan.dailyTargetPages > 0 ? weeklyReviewPlan.dailyTargetPages : null)
      : muraajaa_pages || null

    const latestExistingPlan = existingPlans?.[0] || null
    const requestedStartDate = typeof start_date === "string" && start_date.trim().length > 0
      ? start_date.trim()
      : null
    const normalizedSubmittedEndVerse = Number(end_verse) || endSurahData.verseCount
    const hasSignificantPlanChange = Boolean(
      latestExistingPlan && (
        Number(latestExistingPlan.start_surah_number) !== adjustedStartSurahNumber
        || (Number(latestExistingPlan.start_verse) || 1) !== adjustedStartVerse
        || Number(latestExistingPlan.end_surah_number) !== Number(end_surah_number)
        || (Number(latestExistingPlan.end_verse) || endSurahData.verseCount) !== normalizedSubmittedEndVerse
        || Number(latestExistingPlan.daily_pages) !== Number(daily_pages)
        || String(latestExistingPlan.direction || "asc") !== normalizedDirection
        || Boolean(requestedStartDate && requestedStartDate !== latestExistingPlan.start_date)
      )
    )
    const effectiveStartDate = hasSignificantPlanChange
      ? (requestedStartDate || getSaudiDateString())
      : (requestedStartDate || latestExistingPlan?.start_date || getSaudiDateString())

    const planPayload = {
      student_id,
      semester_id: activeSemester.id,
      start_surah_number: adjustedStartSurahNumber,
      start_surah_name: SURAHS.find((surah) => surah.number === adjustedStartSurahNumber)?.name || start_surah_name,
      start_verse: adjustedStartVerse || null,
      end_surah_number,
      end_surah_name,
      end_verse: end_verse || null,
      daily_pages,
      total_pages: persistedTotalPages,
      total_days: totalDays,
      start_date: effectiveStartDate,
      direction: normalizedDirection,
      has_previous: effectiveHasPrevious,
      prev_start_surah: effectivePrevStartSurah,
      prev_start_verse: effectivePrevStartVerse,
      prev_end_surah: effectivePrevEndSurah,
      prev_end_verse: effectivePrevEndVerse,
      previous_memorization_ranges: effectivePreviousRanges.length > 0 ? effectivePreviousRanges : null,
      muraajaa_pages: effectiveMuraajaaPages,
      rabt_pages: rabt_pages || null,
      muraajaa_mode: normalizedMuraajaaMode,
      weekly_muraajaa_total_pages: normalizedMuraajaaMode === "weekly_distributed" && Number.isFinite(Number(weekly_muraajaa_total_pages)) && Number(weekly_muraajaa_total_pages) > 0 ? Number(weekly_muraajaa_total_pages) : null,
      weekly_muraajaa_min_daily_pages: normalizedMuraajaaMode === "weekly_distributed" ? Number(weekly_muraajaa_min_daily_pages) : null,
      weekly_muraajaa_start_day: normalizedMuraajaaMode === "weekly_distributed" ? Number(weekly_muraajaa_start_day) : null,
      weekly_muraajaa_end_day: normalizedMuraajaaMode === "weekly_distributed" ? Number(weekly_muraajaa_end_day) : null,
    }

    const primaryExistingPlanId = latestExistingPlan?.id || null
    const query = primaryExistingPlanId
      ? supabase
          .from("student_plans")
          .update(planPayload)
          .eq("id", primaryExistingPlanId)
      : supabase
          .from("student_plans")
          .insert([planPayload])

    const { data, error } = await query
      .select()
      .single()

    if (error) throw error

    const oldPlanIds = (existingPlans || [])
      .map((plan) => plan.id)
      .filter((planId) => Boolean(planId) && planId !== primaryExistingPlanId)
    if (oldPlanIds.length > 0) {
      const { error: cleanupError } = await supabase
        .from("student_plans")
        .delete()
        .in("id", oldPlanIds)

      if (cleanupError) {
        console.error("[plans] cleanup old plans error:", cleanupError)
      }
    }

    return NextResponse.json({
      success: true,
      plan: {
        ...data,
        completed_juzs: normalizedCompletedJuzs,
        current_juzs: pendingMasteryJuzs,
      },
      message: adjustedPlanMessage,
    }, { status: 201 })
  } catch (error) {
    console.error("[plans] POST error:", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ error: "لا يوجد فصل نشط حاليًا. ابدأ فصلًا جديدًا قبل إنشاء أو تعديل الخطط." }, { status: 409 })
    }
    if (isMissingSemestersTable(error)) {
      return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
    }
    if (/previous_memorization_ranges|memorized_ranges|column/i.test(String((error as any)?.message || ""))) {
      return NextResponse.json({ error: "حقول المقاطع السابقة غير موجودة بعد. نفذ ملف scripts/049_add_previous_memorization_ranges.sql ثم أعد المحاولة." }, { status: 500 })
    }
    return NextResponse.json({ error: "حدث خطأ في حفظ الخطة" }, { status: 500 })
  }
}

// DELETE - حذف خطة
export async function DELETE(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
    const activeSemester = await getOrCreateActiveSemester(supabase)
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get("plan_id")
    const studentId = searchParams.get("student_id")

    if (planId) {
      const { data: plan, error: planError } = await supabase
        .from("student_plans")
        .select("student_id")
        .eq("id", planId)
        .maybeSingle()

      if (planError) {
        throw planError
      }

      if (!plan?.student_id) {
        return NextResponse.json({ error: "الخطة غير موجودة" }, { status: 404 })
      }

      const studentAccess = await ensureStudentAccess(supabase, session, plan.student_id)
      if ("response" in studentAccess) {
        return studentAccess.response
      }

      const { error } = await supabase.from("student_plans").delete().eq("id", planId)
      if (error) throw error
    } else if (studentId) {
      const studentAccess = await ensureStudentAccess(supabase, session, studentId)
      if ("response" in studentAccess) {
        return studentAccess.response
      }

      const { error } = await supabase.from("student_plans").delete().eq("student_id", studentId)
        .eq("semester_id", activeSemester.id)
      if (error) throw error
    } else {
      return NextResponse.json({ error: "معرف مطلوب" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[plans] DELETE error:", error)
    if (isNoActiveSemesterError(error)) {
      return NextResponse.json({ error: "لا يوجد فصل نشط حاليًا." }, { status: 409 })
    }
    if (isMissingSemestersTable(error)) {
      return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
    }
    return NextResponse.json({ error: "حدث خطأ في حذف الخطة" }, { status: 500 })
  }
}
