import { fillAbsenceWhatsAppTemplate, getAbsenceWhatsAppTemplates } from "@/lib/whatsapp-notification-templates"

export type AbsenceNotificationTemplates = Record<string, string>

export type AbsenceNotificationTemplateEntry = {
  threshold: number
  message: string
}

export const ABSENCE_SETTINGS_ID = "absence_notifications"

export const DEFAULT_ABSENCE_NOTIFICATION_TEMPLATES: AbsenceNotificationTemplates = {
  "1": "تنبيه: لديك غياب واحد عن الحلقة. نأمل الالتزام بالحضور.",
  "2": "تنبيه: لديك غيابان عن الحلقة. نرجو تدارك ذلك والحرص على الانتظام.",
  "3": "إنذار: لديك 3 غيابات عن الحلقة. نأمل معالجة السبب فورًا.",
  "4": "إنذار نهائي: لديك 4 غيابات عن الحلقة. يرجى التواصل مع الإدارة بخصوص ذلك.",
}

type SupabaseLike = {
  from: (table: string) => any
}

export function normalizeAbsenceNotificationTemplates(value: unknown): AbsenceNotificationTemplates {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const normalized: AbsenceNotificationTemplates = {}

  for (const [rawThreshold, rawMessage] of Object.entries(candidate)) {
    const threshold = Number(rawThreshold)
    if (!Number.isInteger(threshold) || threshold < 1) {
      continue
    }

    if (typeof rawMessage !== "string" || !rawMessage.trim()) {
      continue
    }

    normalized[String(threshold)] = rawMessage.trim()
  }
  return normalized
}

export function getSortedAbsenceNotificationTemplateEntries(templates: AbsenceNotificationTemplates): AbsenceNotificationTemplateEntry[] {
  return Object.entries(normalizeAbsenceNotificationTemplates(templates))
    .map(([threshold, message]) => ({ threshold: Number(threshold), message }))
    .filter((entry) => Number.isInteger(entry.threshold) && entry.threshold >= 1 && entry.message.trim())
    .sort((left, right) => left.threshold - right.threshold)
}

export async function getAbsenceNotificationTemplates(supabase: SupabaseLike) {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("id", ABSENCE_SETTINGS_ID)
    .maybeSingle()

  if (error) {
    if (`${error.message || ""}`.includes("site_settings") || error.code === "42P01") {
      return DEFAULT_ABSENCE_NOTIFICATION_TEMPLATES
    }

    throw error
  }

  if (data?.value == null) {
    return DEFAULT_ABSENCE_NOTIFICATION_TEMPLATES
  }

  return normalizeAbsenceNotificationTemplates(data?.value)
}

export async function saveAbsenceNotificationTemplates(supabase: SupabaseLike, templates: AbsenceNotificationTemplates) {
  const normalizedTemplates = normalizeAbsenceNotificationTemplates(templates)

  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: ABSENCE_SETTINGS_ID, value: normalizedTemplates })

  if (error) throw error

  return normalizedTemplates
}

export function fillAbsenceNotificationTemplate(template: string, params: {
  studentName: string
  absenceCount: number
  date: string
  halaqah?: string | null
}) {
  return template
    .replaceAll("{name}", params.studentName)
    .replaceAll("{count}", String(params.absenceCount))
    .replaceAll("{date}", params.date)
    .replaceAll("{halaqah}", params.halaqah || "")
}

export async function syncAbsenceNotification(params: {
  supabase: SupabaseLike
  studentId: string
  date: string
  nextStatus?: string | null
  previousStatus?: string | null
  templates?: AbsenceNotificationTemplates
  skipWhatsApp?: boolean
}) {
  const { supabase, studentId, date, nextStatus, previousStatus } = params

  if (nextStatus !== "absent" || previousStatus === "absent") {
    return { sent: false, reason: "not-applicable" as const }
  }

  const { data: studentData, error: studentError } = await supabase
    .from("students")
    .select("name, account_number, halaqah, guardian_phone")
    .eq("id", studentId)
    .maybeSingle()

  if (studentError) throw studentError
  if (!studentData?.account_number) {
    return { sent: false, reason: "missing-student" as const }
  }

  const { count, error: countError } = await supabase
    .from("attendance_records")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("status", "absent")

  if (countError) throw countError

  const absenceCount = count || 0

  const templates = params.templates || await getAbsenceNotificationTemplates(supabase)
  const template = templates[String(absenceCount)]

  if (!template?.trim()) {
    return { sent: false, reason: "no-template" as const, absenceCount }
  }

  const message = fillAbsenceNotificationTemplate(template, {
    studentName: studentData.name || "الطالب",
    absenceCount,
    date,
    halaqah: studentData.halaqah,
  })

  const { count: duplicateCount, error: duplicateError } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_account_number", String(studentData.account_number))
    .eq("message", message)
    .gte("created_at", `${date}T00:00:00`)
    .lte("created_at", `${date}T23:59:59.999`)

  if (duplicateError) throw duplicateError
  if ((duplicateCount || 0) > 0) {
    return { sent: false, reason: "duplicate" as const, absenceCount }
  }

  const { error: insertError } = await supabase
    .from("notifications")
    .insert({
      user_account_number: String(studentData.account_number),
      message,
    })

  if (insertError) throw insertError

  const whatsappTemplates = await getAbsenceWhatsAppTemplates(supabase)
  const whatsappTemplate = whatsappTemplates[String(absenceCount)]

  if (!params.skipWhatsApp && whatsappTemplate?.trim() && studentData.guardian_phone) {
    const { enqueueWhatsAppMessage } = await import("@/lib/whatsapp-queue")
    const whatsappMessage = fillAbsenceWhatsAppTemplate(whatsappTemplate, {
      studentName: studentData.name || "الطالب",
      absenceCount,
      date,
      halaqah: studentData.halaqah,
    })

    await enqueueWhatsAppMessage(supabase, {
      phoneNumber: studentData.guardian_phone,
      message: whatsappMessage,
      dedupeDate: date,
    })
  }

  return { sent: true, absenceCount, message }
}