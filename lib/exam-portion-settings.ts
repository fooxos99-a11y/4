import { getSiteSetting } from "@/lib/site-settings"
import { DEFAULT_EXAM_PORTION_SETTINGS, EXAM_PORTION_SETTINGS_ID } from "@/lib/site-settings-constants"

export type ExamPortionType = "juz" | "hizb"

export type ExamPortionSettings = {
  mode: ExamPortionType
}

export function normalizeExamPortionSettings(value: unknown): ExamPortionSettings {
  const candidate = value && typeof value === "object" ? (value as Partial<ExamPortionSettings>) : {}
  const mode = candidate.mode === "hizb" ? "hizb" : DEFAULT_EXAM_PORTION_SETTINGS.mode

  return { mode }
}

export async function getExamPortionSettings() {
  const value = await getSiteSetting<Partial<ExamPortionSettings>>(EXAM_PORTION_SETTINGS_ID, DEFAULT_EXAM_PORTION_SETTINGS)
  return normalizeExamPortionSettings(value)
}