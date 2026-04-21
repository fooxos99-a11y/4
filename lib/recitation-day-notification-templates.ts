export const RECITATION_DAY_NOTIFICATION_SETTINGS_ID = "recitation_day_notification_templates"

export type RecitationDayNotificationTemplates = {
  app: string
  whatsapp: string
}

export const DEFAULT_RECITATION_DAY_NOTIFICATION_TEMPLATES: RecitationDayNotificationTemplates = {
  app: "تم حفظ تقييم يوم السرد لك. الدرجة الإجمالية: {grade} من 100، الأخطاء: {errors}، التنبيهات: {alerts}.",
  whatsapp: "تنبيه من {halaqah}: تم حفظ تقييم يوم السرد للطالب {name}. الدرجة الإجمالية: {grade} من 100، الأخطاء: {errors}، التنبيهات: {alerts}. المقيّم: {evaluator}.",
}

type TemplateParams = {
  studentName: string
  halaqah?: string | null
  evaluatorName?: string | null
  grade: number | string
  errors: number | string
  alerts: number | string
  date?: string | null
}

function pickTemplateVariant(template: string) {
  const variants = template
    .split(/\r?\n---\r?\n/g)
    .map((variant) => variant.trim())
    .filter(Boolean)

  if (variants.length === 0) {
    return template.trim()
  }

  return variants[Math.floor(Math.random() * variants.length)]
}

export function normalizeRecitationDayNotificationTemplates(value: unknown): RecitationDayNotificationTemplates {
  const candidate = value && typeof value === "object" ? (value as Partial<RecitationDayNotificationTemplates>) : {}

  return {
    app: typeof candidate.app === "string" && candidate.app.trim() ? candidate.app.trim() : DEFAULT_RECITATION_DAY_NOTIFICATION_TEMPLATES.app,
    whatsapp:
      typeof candidate.whatsapp === "string" && candidate.whatsapp.trim()
        ? candidate.whatsapp.trim()
        : DEFAULT_RECITATION_DAY_NOTIFICATION_TEMPLATES.whatsapp,
  }
}

export function fillRecitationDayNotificationTemplate(template: string, params: TemplateParams) {
  return pickTemplateVariant(template)
    .replaceAll("{name}", params.studentName)
    .replaceAll("{halaqah}", params.halaqah || "")
    .replaceAll("{evaluator}", params.evaluatorName || "")
    .replaceAll("{grade}", String(params.grade))
    .replaceAll("{errors}", String(params.errors))
    .replaceAll("{alerts}", String(params.alerts))
    .replaceAll("{date}", params.date || "")
}