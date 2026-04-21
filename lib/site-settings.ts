import { createAdminClient } from "@/lib/supabase/admin"
import {
	DEFAULT_TEACHER_ATTENDANCE_DELAY_MINUTES,
	TEACHER_ATTENDANCE_DELAY_SETTING_ID,
} from "@/lib/site-settings-constants"

export async function getSiteSetting<T>(id: string, fallback: T): Promise<T> {
	try {
		const supabase = createAdminClient()
		const { data, error } = await supabase.from("site_settings").select("value").eq("id", id).maybeSingle()

		if (error || !data?.value) {
			return fallback
		}

		return data.value as T
	} catch {
		return fallback
	}
}

export async function upsertSiteSetting<T>(id: string, value: T) {
	const supabase = createAdminClient()
	return supabase.from("site_settings").upsert({ id, value }, { onConflict: "id" }).select("id, value").single()
}

export async function getTeacherAttendanceDelayMinutes() {
	const setting = await getSiteSetting<{ minutes?: number }>(TEACHER_ATTENDANCE_DELAY_SETTING_ID, {
		minutes: DEFAULT_TEACHER_ATTENDANCE_DELAY_MINUTES,
	})

	const minutes = Number(setting?.minutes)
	if (!Number.isFinite(minutes) || minutes < 0) {
		return DEFAULT_TEACHER_ATTENDANCE_DELAY_MINUTES
	}

	return Math.floor(minutes)
}