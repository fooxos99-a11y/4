type PlanProgressRecord = {
  created_at?: string | null
  date?: string | null
}

function getRecordSequenceKey(record: PlanProgressRecord) {
  return String(record.created_at || record.date || "")
}

export function sortPlanProgressRecords<T extends PlanProgressRecord>(records: T[]) {
  return [...records].sort((left, right) => {
    const sequenceComparison = getRecordSequenceKey(left).localeCompare(getRecordSequenceKey(right))
    if (sequenceComparison !== 0) return sequenceComparison

    const dateComparison = String(left.date || "").localeCompare(String(right.date || ""))
    if (dateComparison !== 0) return dateComparison

    return String(left.created_at || "").localeCompare(String(right.created_at || ""))
  })
}

export function getCompletedMemorizationDays<T extends PlanProgressRecord>(records: T[], totalSessions: number) {
  return Math.max(0, Math.min(Math.max(0, totalSessions), sortPlanProgressRecords(records).length))
}

export function getCompletedMemorizationRecords<T extends PlanProgressRecord>(records: T[], totalSessions: number) {
  return sortPlanProgressRecords(records).slice(0, Math.max(0, totalSessions))
}

export function getPendingSessionIndices(totalSessions: number, completedDays: number) {
  const safeTotalSessions = Math.max(0, Math.floor(Number(totalSessions) || 0))
  const safeCompletedDays = Math.max(0, Math.min(safeTotalSessions, Math.floor(Number(completedDays) || 0)))

  return Array.from({ length: safeTotalSessions - safeCompletedDays }, (_, index) => safeCompletedDays + index + 1)
}

export function getScheduledSessionProgress<T extends PlanProgressRecord>(records: T[], scheduledDates: string[]) {
  const normalizedScheduledDates = scheduledDates
    .map((date) => String(date || "").trim())
    .filter(Boolean)
  const scheduledDateSet = new Set(normalizedScheduledDates)
  const recordByDate = new Map<string, T>()

  for (const record of sortPlanProgressRecords(records)) {
    const recordDate = String(record.date || "").trim()
    if (!recordDate || !scheduledDateSet.has(recordDate)) {
      continue
    }

    recordByDate.set(recordDate, record)
  }

  const completedSessionIndices: number[] = []
  const completedRecords: T[] = []

  normalizedScheduledDates.forEach((scheduledDate, index) => {
    const record = recordByDate.get(scheduledDate)
    if (!record) {
      return
    }

    completedSessionIndices.push(index + 1)
    completedRecords.push(record)
  })

  const completedSessionSet = new Set(completedSessionIndices)
  const pendingSessionIndices = normalizedScheduledDates
    .map((_, index) => index + 1)
    .filter((sessionIndex) => !completedSessionSet.has(sessionIndex))

  return {
    completedDays: completedSessionIndices.length,
    completedSessionIndices,
    completedRecords,
    pendingSessionIndices,
  }
}