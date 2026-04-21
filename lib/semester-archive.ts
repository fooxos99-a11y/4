import {
  applyAttendancePointsAdjustment,
  calculateTotalEvaluationPoints,
  isPassingMemorizationLevel,
} from "@/lib/student-attendance"

export type SemesterArchiveStats = {
  students_count: number
  circles_count: number
  plans_count: number
  student_records_count: number
  absences_count: number
  present_count: number
  late_count: number
  excused_count: number
  earned_points: number
  memorized_pages: number
  revised_pages: number
  tied_pages: number
  invoices_total: number
  expenses_total: number
  incomes_total: number
  trips_total: number
  finance_count: number
}

export type SemesterArchiveSnapshot = {
  generated_at: string
  counts: Pick<SemesterArchiveStats, "plans_count" | "student_records_count" | "absences_count" | "finance_count" | "students_count" | "circles_count">
  stats: SemesterArchiveStats
}

type AttendanceEvaluation = {
  hafiz_level?: string | null
  tikrar_level?: string | null
  samaa_level?: string | null
  rabet_level?: string | null
}

const EMPTY_STATS: SemesterArchiveStats = {
  students_count: 0,
  circles_count: 0,
  plans_count: 0,
  student_records_count: 0,
  absences_count: 0,
  present_count: 0,
  late_count: 0,
  excused_count: 0,
  earned_points: 0,
  memorized_pages: 0,
  revised_pages: 0,
  tied_pages: 0,
  invoices_total: 0,
  expenses_total: 0,
  incomes_total: 0,
  trips_total: 0,
  finance_count: 0,
}

export function getSemesterEndDate(semester: { end_date?: string | null; archived_at?: string | null }) {
  if (semester.end_date) return semester.end_date
  if (semester.archived_at) return semester.archived_at.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

export function getSemesterSnapshot(value: unknown): SemesterArchiveSnapshot | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const snapshot = value as Partial<SemesterArchiveSnapshot>
  if (!snapshot.stats || !snapshot.counts) {
    return null
  }

  return snapshot as SemesterArchiveSnapshot
}

function getEvaluationRecord(value: AttendanceEvaluation[] | AttendanceEvaluation | null | undefined) {
  if (Array.isArray(value)) {
    return value[value.length - 1] || {}
  }

  return value || {}
}

function sumTripCosts(value: unknown) {
  if (!Array.isArray(value)) return 0
  return value.reduce((total, item) => {
    const amount = Number(item)
    return Number.isFinite(amount) ? total + amount : total
  }, 0)
}

function getStudentRelation(
  value:
    | { name?: string | null; account_number?: number | null; halaqah?: string | null }
    | Array<{ name?: string | null; account_number?: number | null; halaqah?: string | null }>
    | null
    | undefined,
) {
  return Array.isArray(value) ? value[0] || null : value || null
}

export function asStudentRecord(
  student: { id: string; name?: string | null; account_number?: number | null; halaqah?: string | null } | null | undefined,
) {
  if (!student) return null

  return {
    name: student.name || null,
    account_number: student.account_number || null,
    halaqah: student.halaqah || null,
  }
}

export function buildSemesterArchiveData({
  plansRows,
  attendanceRows,
  invoiceRows,
  expenseRows,
  incomeRows,
  tripRows,
  studentMap,
  generatedAt,
}: {
  plansRows: any[]
  attendanceRows: any[]
  invoiceRows: any[]
  expenseRows: any[]
  incomeRows: any[]
  tripRows: any[]
  studentMap: Map<string, { id: string; name?: string | null; account_number?: number | null; halaqah?: string | null }>
  generatedAt?: string
}) {
  const normalizedPlans = plansRows
    .map((plan) => ({
      ...plan,
      students: asStudentRecord(studentMap.get(String(plan.student_id || ""))),
    }))
    .filter((plan) => plan.students)

  const normalizedAttendanceRows = attendanceRows
    .map((row) => ({
      ...row,
      students: asStudentRecord(studentMap.get(String(row.student_id || ""))),
    }))
    .filter((row) => row.students)

  const absenceMap = new Map<
    string,
    {
      student_id: string
      name: string
      account_number: number | null
      halaqah: string | null
      absenceCount: number
      lastAbsenceDate: string | null
      absenceDates: string[]
    }
  >()
  const uniqueStudentIds = new Set<string>()
  const uniqueCircles = new Set<string>()

  let memorizedPages = 0
  let revisedPages = 0
  let tiedPages = 0
  let presentCount = 0
  let lateCount = 0
  let absentCount = 0
  let excusedCount = 0
  let earnedPoints = 0

  const plansByStudent = new Map(normalizedPlans.map((plan) => [String(plan.student_id), plan]))

  for (const row of normalizedAttendanceRows) {
    const student = getStudentRelation(row.students)
    const evaluation = getEvaluationRecord(row.evaluations as AttendanceEvaluation[] | AttendanceEvaluation | null)
    const plan = plansByStudent.get(String(row.student_id))

    uniqueStudentIds.add(String(row.student_id))

    const circleName = row.halaqah || student?.halaqah || null
    if (circleName) {
      uniqueCircles.add(circleName)
    }

    if (row.status === "present") presentCount += 1
    if (row.status === "late") lateCount += 1
    if (row.status === "absent") absentCount += 1
    if (row.status === "excused") excusedCount += 1

    if (row.status === "absent") {
      const current = absenceMap.get(String(row.student_id)) || {
        student_id: String(row.student_id),
        name: student?.name || "",
        account_number: student?.account_number || null,
        halaqah: circleName,
        absenceCount: 0,
        lastAbsenceDate: null,
        absenceDates: [],
      }

      current.absenceCount += 1
      current.lastAbsenceDate = !current.lastAbsenceDate || row.date > current.lastAbsenceDate ? row.date : current.lastAbsenceDate
      current.absenceDates = [...current.absenceDates, row.date]
      absenceMap.set(String(row.student_id), current)
    }

    if (row.status === "present" || row.status === "late") {
      earnedPoints += applyAttendancePointsAdjustment(calculateTotalEvaluationPoints(evaluation), row.status)
    }

    if (!plan || (row.status !== "present" && row.status !== "late")) {
      continue
    }

    const dailyPages = Math.max(0, Number(plan.daily_pages || 0))
    const reviewPages = Math.max(0, Number(plan.muraajaa_pages || 0))
    const tiePages = Math.max(0, Number(plan.rabt_pages || 0))

    if (isPassingMemorizationLevel(evaluation.hafiz_level)) memorizedPages += dailyPages
    if (isPassingMemorizationLevel(evaluation.samaa_level)) revisedPages += reviewPages
    if (isPassingMemorizationLevel(evaluation.rabet_level)) tiedPages += tiePages
  }

  for (const plan of normalizedPlans) {
    uniqueStudentIds.add(String(plan.student_id))
    const student = getStudentRelation(plan.students)
    if (student?.halaqah) {
      uniqueCircles.add(student.halaqah)
    }
  }

  const stats: SemesterArchiveStats = {
    ...EMPTY_STATS,
    students_count: uniqueStudentIds.size,
    circles_count: uniqueCircles.size,
    plans_count: normalizedPlans.length,
    student_records_count: normalizedAttendanceRows.length,
    absences_count: absentCount,
    present_count: presentCount,
    late_count: lateCount,
    excused_count: excusedCount,
    earned_points: earnedPoints,
    memorized_pages: memorizedPages,
    revised_pages: revisedPages,
    tied_pages: tiedPages,
    invoices_total: invoiceRows.reduce((total, row) => total + Number(row.amount || 0), 0),
    expenses_total: expenseRows.reduce((total, row) => total + Number(row.amount || 0), 0),
    incomes_total: incomeRows.reduce((total, row) => total + Number(row.amount || 0), 0),
    trips_total: tripRows.reduce((total, row) => total + sumTripCosts(row.costs), 0),
    finance_count: invoiceRows.length + expenseRows.length + incomeRows.length + tripRows.length,
  }

  const snapshot: SemesterArchiveSnapshot = {
    generated_at: generatedAt || new Date().toISOString(),
    counts: {
      plans_count: stats.plans_count,
      student_records_count: stats.student_records_count,
      absences_count: stats.absences_count,
      finance_count: stats.finance_count,
      students_count: stats.students_count,
      circles_count: stats.circles_count,
    },
    stats,
  }

  return {
    plans: normalizedPlans,
    studentRecords: normalizedAttendanceRows,
    absences: Array.from(absenceMap.values())
      .filter((absence) => absence.absenceCount > 0 && !!absence.name)
      .sort((left, right) => {
        if (right.absenceCount !== left.absenceCount) {
          return right.absenceCount - left.absenceCount
        }

        return (left.name || "").localeCompare(right.name || "", "ar")
      }),
    finance: {
      invoices: invoiceRows,
      expenses: expenseRows,
      incomes: incomeRows,
      trips: tripRows,
    },
    stats,
    snapshot,
  }
}