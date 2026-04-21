export type AbsenceNotificationTemplates = Record<string, string>

function normalizeAbsenceNotificationTemplates(value: unknown): AbsenceNotificationTemplates {
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

export const EXAM_WHATSAPP_SETTINGS_ID = "exam_whatsapp_notifications"
export const ABSENCE_WHATSAPP_SETTINGS_ID = "absence_whatsapp_notifications"

export type ExamWhatsAppTemplates = {
  create: string
  update: string
  cancel: string
  result: string
}

export type ExamNotificationKind = keyof ExamWhatsAppTemplates

type SupabaseLike = {
  from: (table: string) => any
}

export const DEFAULT_EXAM_WHATSAPP_TEMPLATES: ExamWhatsAppTemplates = {
  create: "تنبيه من {halaqah}: تم تحديد اختبار للطالب {name} في {portion} بتاريخ {date}.",
  update: "تنبيه من {halaqah}: تم تحديث موعد اختبار الطالب {name} في {portion} إلى تاريخ {date}.",
  cancel: "تنبيه من {halaqah}: تم إلغاء موعد اختبار الطالب {name} في {portion} بتاريخ {date}.",
  result: "نتيجة اختبار {name} في {halaqah}: {portion} بتاريخ {date}. النتيجة: {score} من {max_score}. الحالة: {status}. المختبر: {tested_by}.{notes}",
}

export const DEFAULT_ABSENCE_WHATSAPP_TEMPLATES: AbsenceNotificationTemplates = {
  "1": "تنبيه من {halaqah}: الطالب {name} لديه غياب واحد بتاريخ {date}.",
  "2": "تنبيه من {halaqah}: الطالب {name} لديه غيابان حتى تاريخ {date}. نرجو المتابعة.",
  "3": "إنذار من {halaqah}: الطالب {name} لديه 3 غيابات حتى تاريخ {date}. نأمل معالجة السبب فوراً.",
  "4": "إنذار نهائي من {halaqah}: الطالب {name} لديه 4 غيابات حتى تاريخ {date}. يرجى التواصل مع الإدارة.",
}

export function normalizeExamWhatsAppTemplates(value: unknown): ExamWhatsAppTemplates {
  const candidate = value && typeof value === "object" ? value as Partial<ExamWhatsAppTemplates> : {}

  return {
    create: typeof candidate.create === "string" && candidate.create.trim() ? candidate.create.trim() : DEFAULT_EXAM_WHATSAPP_TEMPLATES.create,
    update: typeof candidate.update === "string" && candidate.update.trim() ? candidate.update.trim() : DEFAULT_EXAM_WHATSAPP_TEMPLATES.update,
    cancel: typeof candidate.cancel === "string" && candidate.cancel.trim() ? candidate.cancel.trim() : DEFAULT_EXAM_WHATSAPP_TEMPLATES.cancel,
    result: typeof candidate.result === "string" && candidate.result.trim() ? candidate.result.trim() : DEFAULT_EXAM_WHATSAPP_TEMPLATES.result,
  }
}

export async function getExamWhatsAppTemplates(supabase: SupabaseLike) {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("id", EXAM_WHATSAPP_SETTINGS_ID)
    .maybeSingle()

  if (error) {
    if (`${error.message || ""}`.includes("site_settings") || error.code === "42P01") {
      return DEFAULT_EXAM_WHATSAPP_TEMPLATES
    }

    throw error
  }

  if (data?.value == null) {
    return DEFAULT_EXAM_WHATSAPP_TEMPLATES
  }

  return normalizeExamWhatsAppTemplates(data.value)
}

export async function saveExamWhatsAppTemplates(supabase: SupabaseLike, templates: ExamWhatsAppTemplates) {
  const normalizedTemplates = normalizeExamWhatsAppTemplates(templates)

  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: EXAM_WHATSAPP_SETTINGS_ID, value: normalizedTemplates })

  if (error) throw error

  return normalizedTemplates
}

export async function getAbsenceWhatsAppTemplates(supabase: SupabaseLike) {
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("id", ABSENCE_WHATSAPP_SETTINGS_ID)
    .maybeSingle()

  if (error) {
    if (`${error.message || ""}`.includes("site_settings") || error.code === "42P01") {
      return DEFAULT_ABSENCE_WHATSAPP_TEMPLATES
    }

    throw error
  }

  if (data?.value == null) {
    return DEFAULT_ABSENCE_WHATSAPP_TEMPLATES
  }

  const normalized = normalizeAbsenceNotificationTemplates(data.value)
  return Object.keys(normalized).length > 0 ? normalized : DEFAULT_ABSENCE_WHATSAPP_TEMPLATES
}

export async function saveAbsenceWhatsAppTemplates(supabase: SupabaseLike, templates: AbsenceNotificationTemplates) {
  const normalizedTemplates = normalizeAbsenceNotificationTemplates(templates)

  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: ABSENCE_WHATSAPP_SETTINGS_ID, value: normalizedTemplates })

  if (error) throw error

  return normalizedTemplates
}

export function fillExamWhatsAppTemplate(template: string, params: {
  studentName: string
  date: string
  portion: string
  halaqah?: string | null
  score?: string | number | null
  maxScore?: string | number | null
  status?: string | null
  testedBy?: string | null
  notes?: string | null
}) {
  return template
    .replaceAll("{name}", params.studentName)
    .replaceAll("{date}", params.date)
    .replaceAll("{portion}", params.portion)
    .replaceAll("{halaqah}", params.halaqah || "")
    .replaceAll("{score}", params.score == null ? "" : String(params.score))
    .replaceAll("{max_score}", params.maxScore == null ? "" : String(params.maxScore))
    .replaceAll("{status}", params.status || "")
    .replaceAll("{tested_by}", params.testedBy || "")
    .replaceAll("{notes}", params.notes || "")
}

export function buildExamAppNotificationMessage(
  kind: ExamNotificationKind,
  params: {
    studentName: string
    date: string
    portion: string
    halaqah?: string | null
  },
  templates?: Partial<ExamWhatsAppTemplates> | null,
) {
  const normalizedTemplates = normalizeExamWhatsAppTemplates(templates)
  const selectedTemplate = normalizedTemplates[kind]

  if (selectedTemplate === DEFAULT_EXAM_WHATSAPP_TEMPLATES[kind]) {
    if (kind === "result") {
      return `تم حفظ نتيجة اختبارك في ${params.portion} بتاريخ ${params.date}.`
    }

    if (kind === "update") {
      return `تم تحديث موعد اختبارك في ${params.portion} إلى تاريخ ${params.date}.`
    }

    if (kind === "cancel") {
      return `تم إلغاء موعد اختبارك في ${params.portion} بتاريخ ${params.date}.`
    }

    return `تم تحديد موعد اختبارك في ${params.portion} بتاريخ ${params.date}.`
  }

  return fillExamWhatsAppTemplate(selectedTemplate, params)
}

export function fillAbsenceWhatsAppTemplate(template: string, params: {
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

