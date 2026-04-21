export const WEEKDAY_OPTIONS = [
  { value: "0", label: "الأحد" },
  { value: "1", label: "الاثنين" },
  { value: "2", label: "الثلاثاء" },
  { value: "3", label: "الأربعاء" },
  { value: "4", label: "الخميس" },
  { value: "5", label: "الجمعة" },
  { value: "6", label: "السبت" },
] as const

export const WEEKLY_REVIEW_MIN_OPTIONS = [
  { value: "10", label: "حزب" },
  { value: "20", label: "جزء واحد" },
  { value: "40", label: "جزئين" },
  { value: "60", label: "3 أجزاء" },
]

export type ReviewMode = "daily_fixed" | "weekly_distributed"

export type WeeklyReviewConfig = {
  totalPages: number
  minDailyPages: number
  startDay: number
  endDay: number
}

export type WeeklyReviewDayAllocation = {
  dayIndex: number
  pages: number
}

export type WeeklyReviewPlan = {
  dayIndices: number[]
  allocations: WeeklyReviewDayAllocation[]
  dailyTargetPages: number
  repeatsToMeetMinimum: boolean
}

function roundToSingleDecimal(value: number) {
  return Math.round(value * 10) / 10
}

export function formatReviewPagesLabel(pages: number | string | null | undefined) {
  const normalizedPages = Number(pages)
  if (!Number.isFinite(normalizedPages) || normalizedPages <= 0) {
    return "-"
  }

  if (normalizedPages === 10) return "حزب"
  if (normalizedPages === 20) return "جزء واحد"
  if (normalizedPages === 40) return "جزئين"
  if (normalizedPages === 60) return "3 أجزاء"

  if (normalizedPages % 20 === 0) {
    const parts = normalizedPages / 20
    return parts === 1 ? "جزء واحد" : `${parts} أجزاء`
  }

  return `${roundToSingleDecimal(normalizedPages)} وجه`
}

export function getWeeklyDayRange(startDay: number, endDay: number) {
  if (!Number.isInteger(startDay) || !Number.isInteger(endDay)) {
    return []
  }

  const days: number[] = []
  let current = startDay

  while (true) {
    days.push(current)
    if (current === endDay) {
      break
    }
    current = (current + 1) % 7
  }

  return days
}

export function buildWeeklyReviewPlan(config: WeeklyReviewConfig): WeeklyReviewPlan {
  const totalPages = Number(config.totalPages)
  const minDailyPages = Number(config.minDailyPages)
  const dayIndices = getWeeklyDayRange(Number(config.startDay), Number(config.endDay))

  if (!Number.isFinite(totalPages) || totalPages <= 0 || !Number.isFinite(minDailyPages) || minDailyPages <= 0 || dayIndices.length === 0) {
    return {
      dayIndices,
      allocations: dayIndices.map((dayIndex) => ({ dayIndex, pages: 0 })),
      dailyTargetPages: 0,
      repeatsToMeetMinimum: false,
    }
  }

  if (totalPages <= minDailyPages) {
    return {
      dayIndices,
      allocations: dayIndices.map((dayIndex) => ({ dayIndex, pages: totalPages })),
      dailyTargetPages: totalPages,
      repeatsToMeetMinimum: true,
    }
  }

  const averagePerDay = totalPages / dayIndices.length
  if (averagePerDay >= minDailyPages) {
    const dailyTargetPages = roundToSingleDecimal(averagePerDay)
    return {
      dayIndices,
      allocations: dayIndices.map((dayIndex) => ({ dayIndex, pages: dailyTargetPages })),
      dailyTargetPages,
      repeatsToMeetMinimum: false,
    }
  }

  const dailyTargetPages = minDailyPages
  const requiredDays = Math.min(dayIndices.length, Math.ceil(totalPages / minDailyPages))

  return {
    dayIndices,
    allocations: dayIndices.map((dayIndex, index) => ({
      dayIndex,
      pages: index < requiredDays ? dailyTargetPages : 0,
    })),
    dailyTargetPages,
    repeatsToMeetMinimum: true,
  }
}

export function getWeekdayLabel(dayIndex: number) {
  return WEEKDAY_OPTIONS.find((day) => Number(day.value) === dayIndex)?.label || ""
}