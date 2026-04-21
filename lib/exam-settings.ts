import { getSiteSetting } from "@/lib/site-settings"
import { DEFAULT_EXAM_SETTINGS, EXAM_SETTINGS_ID } from "@/lib/site-settings-constants"

export type ExamSettings = {
	maxScore: number
	alertDeduction: number
	mistakeDeduction: number
	minPassingScore: number
}

export type ExamScoreInput = {
	alerts?: number | null
	mistakes?: number | null
}

function normalizeNonNegativeNumber(value: unknown, fallback: number) {
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || parsed < 0) {
		return fallback
	}

	return parsed
}

export function normalizeExamSettings(value: unknown): ExamSettings {
	const candidate = value && typeof value === "object" ? (value as Partial<ExamSettings>) : {}
	const maxScore = Math.max(1, Math.round(normalizeNonNegativeNumber(candidate.maxScore, DEFAULT_EXAM_SETTINGS.maxScore)))
	const minPassingScore = Math.min(maxScore, Math.round(normalizeNonNegativeNumber(candidate.minPassingScore, DEFAULT_EXAM_SETTINGS.minPassingScore)))

	return {
		maxScore,
		alertDeduction: normalizeNonNegativeNumber(candidate.alertDeduction, DEFAULT_EXAM_SETTINGS.alertDeduction),
		mistakeDeduction: normalizeNonNegativeNumber(candidate.mistakeDeduction, DEFAULT_EXAM_SETTINGS.mistakeDeduction),
		minPassingScore,
	}
}

export async function getExamSettings() {
	const setting = await getSiteSetting<Partial<ExamSettings>>(EXAM_SETTINGS_ID, DEFAULT_EXAM_SETTINGS)
	return normalizeExamSettings(setting)
}

export function calculateExamScore(input: ExamScoreInput, settings: ExamSettings) {
	const alerts = Math.max(0, Math.floor(normalizeNonNegativeNumber(input.alerts, 0)))
	const mistakes = Math.max(0, Math.floor(normalizeNonNegativeNumber(input.mistakes, 0)))

	const totalDeduction = alerts * settings.alertDeduction + mistakes * settings.mistakeDeduction
	const finalScore = Math.max(0, Number((settings.maxScore - totalDeduction).toFixed(2)))

	return {
		alerts,
		mistakes,
		totalDeduction,
		finalScore,
		passed: finalScore >= settings.minPassingScore,
	}
}