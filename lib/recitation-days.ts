import { createClient } from "@/lib/supabase/server"
import { getSaudiDateString } from "@/lib/saudi-time"
import {
  formatQuranRange,
  getJuzBounds,
  getJuzNumbersForPageRange,
  getNormalizedCompletedJuzs,
  getPlanMemorizedRanges,
  getStoredMemorizedRanges,
  SURAHS,
  getPageForAyah,
  type PreviousMemorizationRange,
} from "@/lib/quran-data"
import { getScheduledSessionProgress } from "@/lib/plan-progress"
import { getOrCreateActiveSemester, isMissingSemestersTable, isNoActiveSemesterError } from "@/lib/semesters"

const ADVANCING_MEMORIZATION_LEVELS = ["excellent", "good", "very_good"]

export type RecitationPortionStatus = "not_listened" | "partial" | "completed" | "repeat" | "postponed"

export type RecitationStudentStatus = RecitationPortionStatus

export type RecitationPortionSnapshot = {
  sort_order: number
  portion_type: "juz" | "range"
  label: string
  from_surah: string | null
  from_verse: string | null
  to_surah: string | null
  to_verse: string | null
}

export type RecitationStudentSnapshot = {
  student_id: string
  student_name: string
  account_number: number | null
  halaqah: string | null
  teacher_name: string | null
  full_memorized_text: string
  scattered_parts_text: string | null
  overall_status: RecitationStudentStatus
  evaluator_name: string | null
  heard_amount_text: string | null
  grade: number | null
  errors_count: number
  alerts_count: number
  notes: string | null
  portions: RecitationPortionSnapshot[]
}

type StudentSnapshotSource = {
  id: string
  name?: string | null
  account_number?: number | null
  halaqah?: string | null
  completed_juzs?: number[] | null
  memorized_ranges?: PreviousMemorizationRange[] | null
  memorized_start_surah?: number | null
  memorized_start_verse?: number | null
  memorized_end_surah?: number | null
  memorized_end_verse?: number | null
}

type StudentPlanProgressSource = {
  direction?: "asc" | "desc" | null
  total_pages?: number | null
  total_days?: number | null
  daily_pages?: number | null
  has_previous?: boolean | null
  prev_start_surah?: number | null
  prev_start_verse?: number | null
  prev_end_surah?: number | null
  prev_end_verse?: number | null
  previous_memorization_ranges?: PreviousMemorizationRange[] | null
  start_surah_number?: number | null
  start_verse?: number | null
  end_surah_number?: number | null
  end_verse?: number | null
  start_date?: string | null
}

type StudentPlanProgress = {
  plan: StudentPlanProgressSource | null
  completedDays: number
}

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase()
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object") return ""
  return String((error as { code?: unknown }).code || "")
}

function hasCompletedMemorization(record: any) {
  const evaluations = Array.isArray(record.evaluations)
    ? record.evaluations
    : record.evaluations
      ? [record.evaluations]
      : []

  if ((record.status !== "present" && record.status !== "late") || evaluations.length === 0) {
    return false
  }

  const latestEvaluation = evaluations[evaluations.length - 1]
  return ADVANCING_MEMORIZATION_LEVELS.includes(latestEvaluation?.hafiz_level ?? "")
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

function buildRangeLabel(fromSurahNumber: number, fromVerse: number, toSurahNumber: number, toVerse: number) {
  const fromSurah = SURAHS.find((surah) => surah.number === fromSurahNumber)
  const toSurah = SURAHS.find((surah) => surah.number === toSurahNumber)
  if (!fromSurah || !toSurah) {
    return null
  }

  return {
    label: formatQuranRange(fromSurah.name, String(fromVerse), toSurah.name, String(toVerse)) || `${fromSurah.name} ${fromVerse} الى ${toSurah.name} ${toVerse}`,
    from_surah: fromSurah.name,
    from_verse: String(fromVerse),
    to_surah: toSurah.name,
    to_verse: String(toVerse),
  }
}

function getSurahNumberByName(name?: string | null) {
  if (!name) {
    return null
  }

  return SURAHS.find((surah) => surah.name === name)?.number ?? null
}

function createPortionKey(portion: RecitationPortionSnapshot) {
  return [
    portion.portion_type,
    portion.label,
    portion.from_surah,
    portion.from_verse,
    portion.to_surah,
    portion.to_verse,
  ].join("|")
}

type PortionIdentityLike = {
  portion_type: "juz" | "range"
  label: string
  from_surah: string | null
  from_verse: string | null
  to_surah: string | null
  to_verse: string | null
}

function getPortionJuzNumbers(portion: PortionIdentityLike) {
  const fromSurahNumber = getSurahNumberByName(portion.from_surah)
  const toSurahNumber = getSurahNumberByName(portion.to_surah)
  const fromVerse = Number(portion.from_verse || 1)
  const toVerse = Number(portion.to_verse || 1)

  if (!fromSurahNumber || !toSurahNumber || !Number.isFinite(fromVerse) || !Number.isFinite(toVerse)) {
    return [] as number[]
  }

  return getJuzNumbersForPageRange(
    getPageForAyah(fromSurahNumber, fromVerse),
    getPageForAyah(toSurahNumber, toVerse) + 0.0001,
  )
}

function getSingleJuzNumberForPortion(portion: PortionIdentityLike) {
  const juzNumbers = getPortionJuzNumbers(portion)
  return juzNumbers.length === 1 ? juzNumbers[0] : null
}

function getPortionSpanScore(portion: PortionIdentityLike) {
  if (portion.portion_type === "juz") {
    return Number.POSITIVE_INFINITY
  }

  const fromSurahNumber = getSurahNumberByName(portion.from_surah)
  const toSurahNumber = getSurahNumberByName(portion.to_surah)
  const fromVerse = Number(portion.from_verse || 1)
  const toVerse = Number(portion.to_verse || 1)

  if (!fromSurahNumber || !toSurahNumber || !Number.isFinite(fromVerse) || !Number.isFinite(toVerse)) {
    return 0
  }

  const startPage = getPageForAyah(fromSurahNumber, fromVerse)
  const endPage = getPageForAyah(toSurahNumber, toVerse) + 0.0001
  return Math.max(0, endPage - startPage)
}

function dedupeRecitationPortionsByJuz<T extends PortionIdentityLike>(portions: T[]) {
  const deduped = new Map<string, T>()
  const juzEntries = new Map<number, { key: string; portion: T }>()

  for (const portion of portions) {
    const key = [
      portion.portion_type,
      portion.label,
      portion.from_surah,
      portion.from_verse,
      portion.to_surah,
      portion.to_verse,
    ].join("|")

    if (deduped.has(key)) {
      continue
    }

    const singleJuzNumber = getSingleJuzNumberForPortion(portion)
    if (!singleJuzNumber) {
      deduped.set(key, portion)
      continue
    }

    const existingEntry = juzEntries.get(singleJuzNumber)
    if (!existingEntry) {
      deduped.set(key, portion)
      juzEntries.set(singleJuzNumber, { key, portion })
      continue
    }

    const existingPortion = existingEntry.portion
    const shouldReplaceExisting =
      (portion.portion_type === "juz" && existingPortion.portion_type !== "juz") ||
      (portion.portion_type === existingPortion.portion_type && getPortionSpanScore(portion) > getPortionSpanScore(existingPortion))

    if (shouldReplaceExisting) {
      deduped.delete(existingEntry.key)
      deduped.set(key, portion)
      juzEntries.set(singleJuzNumber, { key, portion })
    }
  }

  return Array.from(deduped.values())
}

function isNearlyEqual(left: number, right: number, epsilon = 0.0001) {
  return Math.abs(left - right) <= epsilon
}

function sortPortions(portions: RecitationPortionSnapshot[]) {
  return [...portions].sort((left, right) => {
    const leftSurahIndex = SURAHS.findIndex((surah) => surah.name === left.from_surah)
    const rightSurahIndex = SURAHS.findIndex((surah) => surah.name === right.from_surah)
    if (leftSurahIndex !== rightSurahIndex) {
      return leftSurahIndex - rightSurahIndex
    }

    return Number(left.from_verse || 0) - Number(right.from_verse || 0)
  }).map((portion, index) => ({ ...portion, sort_order: index + 1 }))
}

function buildPortionsFromRange(range: {
  startPage: number
  endPage: number
  endPageExclusive?: number
  startSurahNumber: number
  startVerseNumber: number
  endSurahNumber: number
  endVerseNumber: number
}) {
  const startPage = Number(range.startPage)
  const endPageExclusive = Number(range.endPageExclusive ?? Math.min(605, Number(range.endPage) + 0.0001))

  if (!Number.isFinite(startPage) || !Number.isFinite(endPageExclusive) || endPageExclusive <= startPage) {
    return [] as RecitationPortionSnapshot[]
  }

  const juzNumbers = getJuzNumbersForPageRange(startPage, endPageExclusive)
  if (juzNumbers.length === 0) {
    const singleRange = buildRangeLabel(
      Number(range.startSurahNumber),
      Number(range.startVerseNumber),
      Number(range.endSurahNumber),
      Number(range.endVerseNumber),
    )

    return singleRange ? [{
      sort_order: 0,
      portion_type: "range",
      label: singleRange.label,
      from_surah: singleRange.from_surah,
      from_verse: singleRange.from_verse,
      to_surah: singleRange.to_surah,
      to_verse: singleRange.to_verse,
    }] : []
  }

  const portions: RecitationPortionSnapshot[] = []

  for (const juzNumber of juzNumbers) {
    const bounds = getJuzBounds(juzNumber)
    if (!bounds) continue

    const overlapStart = Math.max(startPage, bounds.startPage)
    const overlapEndExclusive = Math.min(endPageExclusive, bounds.endPageExclusive)
    if (overlapEndExclusive <= overlapStart) {
      continue
    }

    const coversWholeJuz = overlapStart <= bounds.startPage + 0.0001 && overlapEndExclusive >= bounds.endPageExclusive - 0.0001
    if (coversWholeJuz) {
      portions.push({
        sort_order: 0,
        portion_type: "juz",
        label: `الجزء ${juzNumber}`,
        from_surah: SURAHS.find((surah) => surah.number === bounds.startSurahNumber)?.name || null,
        from_verse: String(bounds.startVerseNumber),
        to_surah: SURAHS.find((surah) => surah.number === bounds.endSurahNumber)?.name || null,
        to_verse: String(bounds.endVerseNumber),
      })
      continue
    }

    const segmentStartSurah = isNearlyEqual(overlapStart, startPage) ? Number(range.startSurahNumber) : Number(bounds.startSurahNumber)
    const segmentStartVerse = isNearlyEqual(overlapStart, startPage) ? Number(range.startVerseNumber) : Number(bounds.startVerseNumber)
    const segmentEndSurah = isNearlyEqual(overlapEndExclusive, endPageExclusive) ? Number(range.endSurahNumber) : Number(bounds.endSurahNumber)
    const segmentEndVerse = isNearlyEqual(overlapEndExclusive, endPageExclusive) ? Number(range.endVerseNumber) : Number(bounds.endVerseNumber)

    const rangeLabel = buildRangeLabel(segmentStartSurah, segmentStartVerse, segmentEndSurah, segmentEndVerse)
    if (!rangeLabel) {
      continue
    }

    portions.push({
      sort_order: 0,
      portion_type: "range",
      label: rangeLabel.label,
      from_surah: rangeLabel.from_surah,
      from_verse: rangeLabel.from_verse,
      to_surah: rangeLabel.to_surah,
      to_verse: rangeLabel.to_verse,
    })
  }

  return portions
}

type PersistedRecitationPortion = {
  id: string
  recitation_day_student_id: string
  sort_order?: number | null
  portion_type: "juz" | "range"
  label: string
  from_surah: string | null
  from_verse: string | null
  to_surah: string | null
  to_verse: string | null
  status?: string | null
  evaluator_name?: string | null
  heard_amount_text?: string | null
  grade?: number | null
  errors_count?: number | null
  alerts_count?: number | null
  notes?: string | null
  created_at?: string | null
  updated_at?: string | null
}

function normalizePersistedStudentPortions(portions: PersistedRecitationPortion[]) {
  const normalizedPortions: Array<Omit<PersistedRecitationPortion, "id">> = []
  let changed = false

  for (const portion of [...portions].sort((left, right) => Number(left.sort_order || 0) - Number(right.sort_order || 0))) {
    const fromSurahNumber = getSurahNumberByName(portion.from_surah)
    const toSurahNumber = getSurahNumberByName(portion.to_surah)
    const fromVerse = Number(portion.from_verse || 1)
    const toVerse = Number(portion.to_verse || 1)

    if (!fromSurahNumber || !toSurahNumber || !Number.isFinite(fromVerse) || !Number.isFinite(toVerse)) {
      normalizedPortions.push({
        recitation_day_student_id: portion.recitation_day_student_id,
        sort_order: 0,
        portion_type: portion.portion_type,
        label: portion.label,
        from_surah: portion.from_surah,
        from_verse: portion.from_verse,
        to_surah: portion.to_surah,
        to_verse: portion.to_verse,
        status: portion.status || "not_listened",
        evaluator_name: portion.evaluator_name || null,
        heard_amount_text: portion.heard_amount_text || null,
        grade: portion.grade ?? null,
        errors_count: Number(portion.errors_count || 0),
        alerts_count: Number(portion.alerts_count || 0),
        notes: portion.notes || null,
        created_at: portion.created_at || null,
        updated_at: portion.updated_at || null,
      })
      continue
    }

    const startPage = getPageForAyah(fromSurahNumber, fromVerse)
    const endPage = getPageForAyah(toSurahNumber, toVerse)
    const splitPortions = buildPortionsFromRange({
      startPage: Math.min(startPage, endPage),
      endPage: Math.max(startPage, endPage),
      startSurahNumber: fromSurahNumber,
      startVerseNumber: fromVerse,
      endSurahNumber: toSurahNumber,
      endVerseNumber: toVerse,
    })

    if (splitPortions.length <= 1) {
      normalizedPortions.push({
        recitation_day_student_id: portion.recitation_day_student_id,
        sort_order: 0,
        portion_type: portion.portion_type,
        label: portion.label,
        from_surah: portion.from_surah,
        from_verse: portion.from_verse,
        to_surah: portion.to_surah,
        to_verse: portion.to_verse,
        status: portion.status || "not_listened",
        evaluator_name: portion.evaluator_name || null,
        heard_amount_text: portion.heard_amount_text || null,
        grade: portion.grade ?? null,
        errors_count: Number(portion.errors_count || 0),
        alerts_count: Number(portion.alerts_count || 0),
        notes: portion.notes || null,
        created_at: portion.created_at || null,
        updated_at: portion.updated_at || null,
      })
      continue
    }

    changed = true
    for (const splitPortion of splitPortions) {
      normalizedPortions.push({
        recitation_day_student_id: portion.recitation_day_student_id,
        sort_order: 0,
        portion_type: splitPortion.portion_type,
        label: splitPortion.label,
        from_surah: splitPortion.from_surah,
        from_verse: splitPortion.from_verse,
        to_surah: splitPortion.to_surah,
        to_verse: splitPortion.to_verse,
        status: portion.status || "not_listened",
        evaluator_name: portion.evaluator_name || null,
        heard_amount_text: portion.heard_amount_text || null,
        grade: portion.grade ?? null,
        errors_count: Number(portion.errors_count || 0),
        alerts_count: Number(portion.alerts_count || 0),
        notes: portion.notes || null,
        created_at: portion.created_at || null,
        updated_at: portion.updated_at || null,
      })
    }
  }

  const deduped = dedupeRecitationPortionsByJuz(normalizedPortions)
  const hasDedupedChanges = deduped.length !== normalizedPortions.length

  return {
    changed: changed || hasDedupedChanges,
    portions: deduped.map((portion, index) => ({
      ...portion,
      sort_order: index + 1,
      updated_at: new Date().toISOString(),
    })),
  }
}

export async function normalizeRecitationDayPortions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  students: Array<{ id: string }>,
  portions: PersistedRecitationPortion[],
) {
  const portionsByStudentId = new Map<string, PersistedRecitationPortion[]>()

  for (const portion of portions) {
    const current = portionsByStudentId.get(portion.recitation_day_student_id) || []
    current.push(portion)
    portionsByStudentId.set(portion.recitation_day_student_id, current)
  }

  const studentIdsToRefresh: string[] = []

  for (const student of students) {
    const studentPortions = portionsByStudentId.get(student.id) || []
    if (studentPortions.length === 0) {
      continue
    }

    const normalized = normalizePersistedStudentPortions(studentPortions)
    if (!normalized.changed) {
      continue
    }

    const { error: deleteError } = await supabase
      .from("recitation_day_portions")
      .delete()
      .eq("recitation_day_student_id", student.id)

    if (deleteError) {
      throw deleteError
    }

    const { error: insertError } = await supabase
      .from("recitation_day_portions")
      .insert(normalized.portions)

    if (insertError) {
      throw insertError
    }

    studentIdsToRefresh.push(student.id)
  }

  if (studentIdsToRefresh.length === 0) {
    return portions
  }

  const { data: refreshedPortions, error: refreshError } = await supabase
    .from("recitation_day_portions")
    .select("*")
    .in("recitation_day_student_id", students.map((student) => student.id))
    .order("sort_order", { ascending: true })

  if (refreshError) {
    throw refreshError
  }

  return refreshedPortions || []
}
function buildStudentPortions(student: StudentSnapshotSource, planProgress: StudentPlanProgress | null) {
  const portionMap = new Map<string, RecitationPortionSnapshot>()

  for (const juzNumber of getNormalizedCompletedJuzs(student.completed_juzs)) {
    const bounds = getJuzBounds(juzNumber)
    if (!bounds) continue

    const juzPortion: RecitationPortionSnapshot = {
      sort_order: 0,
      portion_type: "juz",
      label: `الجزء ${juzNumber}`,
      from_surah: SURAHS.find((surah) => surah.number === bounds.startSurahNumber)?.name || null,
      from_verse: String(bounds.startVerseNumber),
      to_surah: SURAHS.find((surah) => surah.number === bounds.endSurahNumber)?.name || null,
      to_verse: String(bounds.endVerseNumber),
    }

    portionMap.set(createPortionKey(juzPortion), juzPortion)
  }

  const storedRanges = getStoredMemorizedRanges(student)
  const planRanges = planProgress?.plan
    ? getPlanMemorizedRanges(planProgress.plan, Number(planProgress.completedDays) || 0)
    : []

  for (const range of [...storedRanges, ...planRanges]) {
    if (!range) continue

    for (const portion of buildPortionsFromRange({
      startPage: getPageForAyah(Number(range.startSurahNumber), Number(range.startVerseNumber)),
      endPage: getPageForAyah(Number(range.endSurahNumber), Number(range.endVerseNumber)),
      startSurahNumber: Number(range.startSurahNumber),
      startVerseNumber: Number(range.startVerseNumber),
      endSurahNumber: Number(range.endSurahNumber),
      endVerseNumber: Number(range.endVerseNumber),
    })) {
      portionMap.set(createPortionKey(portion), portion)
    }
  }

  return sortPortions(dedupeRecitationPortionsByJuz(Array.from(portionMap.values())))
}

function buildFullMemorizedText(portions: RecitationPortionSnapshot[]) {
  if (portions.length === 0) {
    return "لا يوجد محفوظ معتمد"
  }

  if (portions.length === 1) {
    return portions[0].label
  }

  const first = portions[0]
  const last = portions[portions.length - 1]

  if (first.from_surah && first.from_verse && last.to_surah && last.to_verse) {
    return `من ${first.from_surah} ${first.from_verse} إلى ${last.to_surah} ${last.to_verse}`
  }

  return portions.map((portion) => portion.label).join("، ")
}

function buildScatteredPartsText(portions: RecitationPortionSnapshot[]) {
  if (portions.length <= 1) {
    return null
  }

  return portions.map((portion) => portion.label).join("، ")
}

export function getRecitationStatusLabel(status?: string | null) {
  switch (status) {
    case "completed":
      return "سُمّع كامل المحفوظ"
    case "partial":
      return "سُمّع جزئيًا"
    case "repeat":
      return "يحتاج إعادة"
    case "postponed":
      return "مؤجل"
    default:
      return "لم يُسمّع"
  }
}

type ArchivedRecitationPortionLike = {
  label?: string | null
  status?: string | null
  evaluator_name?: string | null
  heard_amount_text?: string | null
  grade?: number | null
  errors_count?: number | null
  alerts_count?: number | null
  notes?: string | null
}

type ArchivedRecitationStudentLike = {
  overall_status?: string | null
  evaluator_name?: string | null
  heard_amount_text?: string | null
  grade?: number | null
  errors_count?: number | null
  alerts_count?: number | null
  notes?: string | null
  full_memorized_text?: string | null
  portions?: ArchivedRecitationPortionLike[] | null
}

function hasPortionActivity(portion: ArchivedRecitationPortionLike) {
  return (
    String(portion.status || "") !== "not_listened" ||
    String(portion.evaluator_name || "").trim().length > 0 ||
    String(portion.heard_amount_text || "").trim().length > 0 ||
    portion.grade !== null && portion.grade !== undefined ||
    Math.max(0, Number(portion.errors_count || 0)) > 0 ||
    Math.max(0, Number(portion.alerts_count || 0)) > 0 ||
    String(portion.notes || "").trim().length > 0
  )
}

function deriveArchivedOverallStatus(portions: ArchivedRecitationPortionLike[], fallbackStatus?: string | null) {
  const statuses = portions.map((portion) => String(portion.status || "not_listened"))

  if (statuses.length === 0 || statuses.every((status) => status === "not_listened")) {
    return fallbackStatus || "not_listened"
  }

  if (statuses.every((status) => status === "completed")) {
    return "completed"
  }

  if (statuses.some((status) => status === "partial" || status === "completed")) {
    return "partial"
  }

  if (statuses.some((status) => status === "repeat")) {
    return "repeat"
  }

  if (statuses.some((status) => status === "postponed")) {
    return "postponed"
  }

  return fallbackStatus || "not_listened"
}

function buildArchivedHeardAmountText(portions: ArchivedRecitationPortionLike[], fallbackText?: string | null, fallbackMemorizedText?: string | null) {
  if (String(fallbackText || "").trim()) {
    return fallbackText || null
  }

  const heardLabels = portions
    .filter((portion) => hasPortionActivity(portion))
    .map((portion) => String(portion.heard_amount_text || portion.label || "").trim())
    .filter(Boolean)

  if (heardLabels.length > 0) {
    return heardLabels.join("، ")
  }

  return String(fallbackMemorizedText || "").trim() || null
}

export function shouldIncludeArchivedRecitationStudent(student: ArchivedRecitationStudentLike) {
  if (String(student.overall_status || "") !== "not_listened") {
    return true
  }

  if (String(student.evaluator_name || "").trim().length > 0) {
    return true
  }

  if (String(student.heard_amount_text || "").trim().length > 0) {
    return true
  }

  if (student.grade !== null && student.grade !== undefined) {
    return true
  }

  if (Math.max(0, Number(student.errors_count || 0)) > 0 || Math.max(0, Number(student.alerts_count || 0)) > 0) {
    return true
  }

  if (String(student.notes || "").trim().length > 0) {
    return true
  }

  return Array.isArray(student.portions) && student.portions.some((portion) => hasPortionActivity(portion))
}

export function hydrateArchivedRecitationStudent<T extends ArchivedRecitationStudentLike>(student: T): T {
  const portions = Array.isArray(student.portions) ? student.portions : []
  const activePortions = portions.filter((portion) => hasPortionActivity(portion))
  const gradedPortions = activePortions.filter((portion) => portion.grade !== null && portion.grade !== undefined)
  const firstEvaluator = activePortions.find((portion) => String(portion.evaluator_name || "").trim().length > 0)?.evaluator_name || null
  const aggregatedNotes = activePortions
    .map((portion) => String(portion.notes || "").trim())
    .filter(Boolean)
    .join("، ")

  return {
    ...student,
    overall_status: deriveArchivedOverallStatus(portions, student.overall_status),
    evaluator_name: String(student.evaluator_name || "").trim() || firstEvaluator,
    heard_amount_text: buildArchivedHeardAmountText(portions, student.heard_amount_text, student.full_memorized_text),
    grade: student.grade ?? (gradedPortions.length > 0
      ? Number((gradedPortions.reduce((sum, portion) => sum + Number(portion.grade || 0), 0) / gradedPortions.length).toFixed(2))
      : null),
    errors_count: Math.max(0, Number(student.errors_count || 0)) || activePortions.reduce((sum, portion) => sum + Math.max(0, Number(portion.errors_count || 0)), 0),
    alerts_count: Math.max(0, Number(student.alerts_count || 0)) || activePortions.reduce((sum, portion) => sum + Math.max(0, Number(portion.alerts_count || 0)), 0),
    notes: String(student.notes || "").trim() || aggregatedNotes || null,
  }
}

export async function getStudentActivePlanProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  semesterId?: string | null,
) {
  let planQuery = supabase
    .from("student_plans")
    .select("direction, total_pages, total_days, daily_pages, has_previous, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, previous_memorization_ranges, start_surah_number, start_verse, end_surah_number, end_verse, start_date, semester_id")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)

  if (semesterId) {
    planQuery = planQuery.eq("semester_id", semesterId)
  }

  let { data: plan, error: planError } = await planQuery.maybeSingle()

  if (planError && semesterId && getErrorCode(planError) !== "PGRST116") {
    throw planError
  }

  if (planError) {
    throw planError
  }

  if (!plan) {
    return null
  }

  let attendanceQuery = supabase
    .from("attendance_records")
    .select("id, date, status, is_compensation, created_at, evaluations(hafiz_level)")
    .eq("student_id", studentId)
    .order("date", { ascending: true })

  if (semesterId) {
    attendanceQuery = attendanceQuery.eq("semester_id", semesterId)
  }

  if (plan.start_date) {
    attendanceQuery = attendanceQuery.gte("date", plan.start_date)
  }

  const { data: attendanceRecords, error: attendanceError } = await attendanceQuery

  if (attendanceError) {
    throw attendanceError
  }

  const scheduledDates = plan.start_date
    ? getScheduledStudyDates(
        plan.start_date,
        Number(plan.total_days) > 0
          ? Number(plan.total_days)
          : (Number(plan.total_pages) > 0 && Number(plan.daily_pages) > 0
              ? Math.max(0, Math.ceil(Number(plan.total_pages) / Number(plan.daily_pages)))
              : 0),
      )
    : []

  const passingRecords = (attendanceRecords || []).filter(hasCompletedMemorization)
  const completedDays = getScheduledSessionProgress(passingRecords, scheduledDates).completedDays

  return { plan, completedDays }
}

export async function buildRecitationDayStudentsSnapshot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  options?: {
    halaqah?: string | null
  },
) {
  const normalizedHalaqah = String(options?.halaqah || "").trim()
  let activeSemesterId: string | null = null

  try {
    const activeSemester = await getOrCreateActiveSemester(supabase)
    activeSemesterId = activeSemester.id
  } catch (error) {
    if (!isMissingSemestersTable(error) && !isNoActiveSemesterError(error)) {
      throw error
    }
  }

  let studentsQuery = supabase
    .from("students")
    .select("id, name, account_number, halaqah, completed_juzs, memorized_ranges, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse")
    .order("name", { ascending: true })

  const [{ data: students, error: studentsError }, { data: teachers, error: teachersError }] = await Promise.all([
    studentsQuery,
    supabase
      .from("users")
      .select("name, halaqah, role")
      .in("role", ["teacher", "deputy_teacher"]),
  ])

  if (studentsError) {
    throw studentsError
  }

  if (teachersError) {
    throw teachersError
  }

  const teacherMap = new Map<string, string>()
  for (const teacher of teachers || []) {
    const halaqahKey = normalizeText(teacher.halaqah)
    if (!halaqahKey || teacherMap.has(halaqahKey)) {
      continue
    }

    teacherMap.set(halaqahKey, teacher.name || "")
  }

  const snapshots: RecitationStudentSnapshot[] = []
  const filteredStudents = normalizedHalaqah
    ? (students || []).filter((student) => normalizeText(student.halaqah) === normalizeText(normalizedHalaqah))
    : (students || [])

  for (const student of filteredStudents) {
    const planProgress = activeSemesterId
      ? await getStudentActivePlanProgress(supabase, student.id, activeSemesterId)
      : null
    const portions = buildStudentPortions(student, planProgress)

    snapshots.push({
      student_id: student.id,
      student_name: student.name || "طالب",
      account_number: student.account_number ?? null,
      halaqah: student.halaqah || null,
      teacher_name: teacherMap.get(normalizeText(student.halaqah)) || null,
      full_memorized_text: buildFullMemorizedText(portions),
      scattered_parts_text: buildScatteredPartsText(portions),
      overall_status: "not_listened",
      evaluator_name: null,
      heard_amount_text: null,
      grade: null,
      errors_count: 0,
      alerts_count: 0,
      notes: null,
      portions,
    })
  }

  return snapshots
}