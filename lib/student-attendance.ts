export const ATTENDANCE_STATUS_LABELS = {
  present: "حاضر",
  late: "متأخر",
  absent: "غائب",
  excused: "مستأذن",
} as const

export type AttendanceStatus = keyof typeof ATTENDANCE_STATUS_LABELS

export type EvaluationLevelValue = "excellent" | "very_good" | "good" | "not_completed" | null | undefined

export const LATE_ATTENDANCE_PENALTY = 8

export function translateAttendanceStatus(status: string | null | undefined) {
  if (!status) return null
  return ATTENDANCE_STATUS_LABELS[status as AttendanceStatus] ?? status
}

export function isEvaluatedAttendance(status: string | null | undefined) {
  return status === "present" || status === "late"
}

export function isNonEvaluatedAttendance(status: string | null | undefined) {
  return status === "absent" || status === "excused"
}

export function calculateEvaluationLevelPoints(level: EvaluationLevelValue): number {
  switch (level) {
    case "excellent":
      return 10
    case "very_good":
      return 8
    case "good":
      return 6
    case "not_completed":
      return 4
    default:
      return 0
  }
}

export function isPassingMemorizationLevel(level: EvaluationLevelValue) {
  return !!level && level !== "not_completed"
}

export function calculateTotalEvaluationPoints(levels: {
  hafiz_level?: EvaluationLevelValue
  tikrar_level?: EvaluationLevelValue
  samaa_level?: EvaluationLevelValue
  rabet_level?: EvaluationLevelValue
}) {
  return (
    calculateEvaluationLevelPoints(levels.hafiz_level) +
    calculateEvaluationLevelPoints(levels.tikrar_level) +
    calculateEvaluationLevelPoints(levels.samaa_level) +
    calculateEvaluationLevelPoints(levels.rabet_level)
  )
}

export function applyAttendancePointsAdjustment(totalPoints: number, status: string | null | undefined) {
  if (status === "late") {
    return Math.max(0, totalPoints - LATE_ATTENDANCE_PENALTY)
  }
  return Math.max(0, totalPoints)
}
