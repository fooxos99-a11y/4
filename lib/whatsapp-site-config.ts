function sanitizeInstanceSlug(value: string | null | undefined) {
	return String(value || "")
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
}

function getSupabaseProjectRef(url: string | undefined) {
	try {
		const hostname = new URL(String(url || "")).hostname
		return hostname.split(".")[0] || null
	} catch {
		return null
	}
}

function getDefaultInstanceSlug() {
	const explicitSlug = sanitizeInstanceSlug(process.env.WHATSAPP_INSTANCE_SLUG)
	if (explicitSlug) {
		return explicitSlug
	}

	const configuredClientId = sanitizeInstanceSlug(process.env.WHATSAPP_CLIENT_ID)
	if (configuredClientId) {
		return configuredClientId
	}

	const projectRef = sanitizeInstanceSlug(process.env.SUPABASE_PROJECT_REF || getSupabaseProjectRef(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL))
	if (projectRef) {
		return projectRef
	}

	const portToken = sanitizeInstanceSlug(process.env.PORT)
	if (portToken) {
		return `port-${portToken}`
	}

	return "default"
}

function resolveScopedSettingId(rawValue: string | undefined, baseId: string, instanceSlug: string) {
	const normalizedValue = String(rawValue || "").trim()

	if (!normalizedValue || normalizedValue === baseId) {
		return `${baseId}_${instanceSlug}`
	}

	return normalizedValue
}

export const WHATSAPP_QUEUE_TABLE = process.env.WHATSAPP_QUEUE_TABLE || "whatsapp_queue"
export const WHATSAPP_HISTORY_TABLE = process.env.WHATSAPP_HISTORY_TABLE || "whatsapp_messages"
export const WHATSAPP_REPLIES_TABLE = process.env.WHATSAPP_REPLIES_TABLE || "whatsapp_replies"
export const WHATSAPP_INSTANCE_SLUG = getDefaultInstanceSlug()
export const WHATSAPP_WORKER_STATE_SETTING_ID = resolveScopedSettingId(process.env.WHATSAPP_WORKER_STATE_SETTING_ID, "whatsapp_worker_state", WHATSAPP_INSTANCE_SLUG)
export const WHATSAPP_WORKER_COMMAND_SETTING_ID = resolveScopedSettingId(process.env.WHATSAPP_WORKER_COMMAND_SETTING_ID, "whatsapp_worker_command", WHATSAPP_INSTANCE_SLUG)