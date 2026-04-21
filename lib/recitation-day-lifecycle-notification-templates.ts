export const RECITATION_DAY_LIFECYCLE_NOTIFICATION_SETTINGS_ID = "recitation_day_lifecycle_notification_templates"

export type RecitationDayLifecycleTemplate = {
  app: string
  whatsapp: string
}

export type RecitationDayLifecycleNotificationTemplates = {
  start: RecitationDayLifecycleTemplate
  end: RecitationDayLifecycleTemplate
}

export const DEFAULT_RECITATION_DAY_LIFECYCLE_NOTIFICATION_TEMPLATES: RecitationDayLifecycleNotificationTemplates = {
  start: {
    app: "بدأ يوم السرد بتاريخ {date}. نرجو من الطالب {name} الاستعداد للتسميع.",
    whatsapp: "تنبيه من {halaqah}: بدأ يوم السرد للطالب {name} بتاريخ {date}. نأمل المتابعة والاستعداد.",
  },
  end: {
    app: "تم إنهاء يوم السرد بتاريخ {date}. نشكر الطالب {name} على حضوره ومتابعته.",
    whatsapp: "تنبيه من {halaqah}: تم إنهاء يوم السرد للطالب {name} بتاريخ {date}. نشكر لكم المتابعة.",
  },
}

type TemplateParams = {
  studentName: string
  halaqah?: string | null
  date: string
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

function normalizeLifecycleTemplate(value: unknown, fallback: RecitationDayLifecycleTemplate): RecitationDayLifecycleTemplate {
  const candidate = value && typeof value === "object" ? (value as Partial<RecitationDayLifecycleTemplate>) : {}

  return {
    app: typeof candidate.app === "string" && candidate.app.trim() ? candidate.app.trim() : fallback.app,
    whatsapp: typeof candidate.whatsapp === "string" && candidate.whatsapp.trim() ? candidate.whatsapp.trim() : fallback.whatsapp,
  }
}

export function normalizeRecitationDayLifecycleNotificationTemplates(value: unknown): RecitationDayLifecycleNotificationTemplates {
  const candidate = value && typeof value === "object" ? (value as Partial<RecitationDayLifecycleNotificationTemplates>) : {}

  return {
    start: normalizeLifecycleTemplate(candidate.start, DEFAULT_RECITATION_DAY_LIFECYCLE_NOTIFICATION_TEMPLATES.start),
    end: normalizeLifecycleTemplate(candidate.end, DEFAULT_RECITATION_DAY_LIFECYCLE_NOTIFICATION_TEMPLATES.end),
  }
}

export function fillRecitationDayLifecycleTemplate(template: string, params: TemplateParams) {
  return pickTemplateVariant(template)
    .replaceAll("{name}", params.studentName)
    .replaceAll("{halaqah}", params.halaqah || "")
    .replaceAll("{date}", params.date)
}