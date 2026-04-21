export const TEACHER_ATTENDANCE_DELAY_SETTING_ID = "teacher_attendance_delay"
export const DEFAULT_TEACHER_ATTENDANCE_DELAY_MINUTES = 50

export const EXAM_SETTINGS_ID = "exam_settings"
export const WHATSAPP_WORKER_STATE_SETTING_ID = "whatsapp_worker_state"
export const WHATSAPP_WORKER_COMMAND_SETTING_ID = "whatsapp_worker_command"

export const DEFAULT_EXAM_SETTINGS = {
	maxScore: 100,
	alertDeduction: 2,
	mistakeDeduction: 5,
	minPassingScore: 85,
} as const

export const EXAM_PORTION_SETTINGS_ID = "exam_portion_settings"

export const DEFAULT_EXAM_PORTION_SETTINGS = {
	mode: "juz",
} as const

export const RECITATION_DAY_GRADING_SETTINGS_ID = "recitation_day_grading_settings"

export const DEFAULT_RECITATION_DAY_GRADING_SETTINGS = {
	baseScore: 100,
	errorDeduction: 2,
	alertDeduction: 1,
} as const