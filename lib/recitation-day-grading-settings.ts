import {
  DEFAULT_RECITATION_DAY_GRADING_SETTINGS,
  RECITATION_DAY_GRADING_SETTINGS_ID,
} from "@/lib/site-settings-constants"

export { RECITATION_DAY_GRADING_SETTINGS_ID }

export type RecitationDayGradingSettings = {
  baseScore: number
  errorDeduction: number
  alertDeduction: number
}

export const DEFAULT_RECITATION_DAY_GRADING_SETTINGS_VALUE: RecitationDayGradingSettings = {
  ...DEFAULT_RECITATION_DAY_GRADING_SETTINGS,
}

function normalizeNonNegativeNumber(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback
  }

  return parsed
}

export function normalizeRecitationDayGradingSettings(value: unknown): RecitationDayGradingSettings {
  const candidate = value && typeof value === "object" ? (value as Partial<RecitationDayGradingSettings>) : {}

  return {
    baseScore: normalizeNonNegativeNumber(candidate.baseScore, DEFAULT_RECITATION_DAY_GRADING_SETTINGS.baseScore),
    errorDeduction: normalizeNonNegativeNumber(candidate.errorDeduction, DEFAULT_RECITATION_DAY_GRADING_SETTINGS.errorDeduction),
    alertDeduction: normalizeNonNegativeNumber(candidate.alertDeduction, DEFAULT_RECITATION_DAY_GRADING_SETTINGS.alertDeduction),
  }
}

export function calculateRecitationDayPortionGrade(params: {
  errorsCount?: number | null
  alertsCount?: number | null
  settings: RecitationDayGradingSettings
}) {
  const errorsCount = Math.max(0, Number(params.errorsCount || 0))
  const alertsCount = Math.max(0, Number(params.alertsCount || 0))
  const rawScore =
    params.settings.baseScore - errorsCount * params.settings.errorDeduction - alertsCount * params.settings.alertDeduction

  return Math.max(0, Number(rawScore.toFixed(2)))
}
