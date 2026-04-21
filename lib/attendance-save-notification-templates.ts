export const ATTENDANCE_SAVE_NOTIFICATION_SETTINGS_ID = "attendance_save_guardian_notification_templates"

export type AttendanceSaveNotificationTemplates = {
  present: string
  late: string
  absent: string
  excused: string
}

const DEFAULT_EVALUATED_ATTENDANCE_TEMPLATE = [
  "نفيدكم بحضور ابنكم اليوم، وقد كان مقدار الحفظ: {hafiz_amount}، وكان تقييم الحفظ: {hafiz_evaluation}.",
  "تقييم التكرار: {tikrar_evaluation}",
  "تقييم المراجعة: {samaa_evaluation}",
  "تقييم الربط: {rabet_evaluation}",
  "",
  "نشكر لكم متابعتكم وحرصكم",
].join("\n")

const LEGACY_PRESENT_LATE_DEFAULTS = new Set([
  "تم حفظ تحضير الطالب {name} في حلقة {halaqah} بتاريخ {date} بحالة {status}. التقييم: الحفظ {hafiz}، التكرار {tikrar}، المراجعة {samaa}، الربط {rabet}.",
  "تم حفظ تحضير الطالب {name} بتاريخ {date} بحالة {status}. تقييم الحفظ: {hafiz_evaluation}. مقدار الحفظ: {hafiz_amount}.",
  "تم حفظ تحضير الطالب {name} بتاريخ {date} بحالة {status}. تقييم الحفظ: {hafiz_evaluation}. مقدار الحفظ: {hafiz_amount}. تقييم التكرار: {tikrar_evaluation}. تقييم المراجعة: {samaa_evaluation}. تقييم الربط: {rabet_evaluation}.",
])

export const DEFAULT_ATTENDANCE_SAVE_NOTIFICATION_TEMPLATES: AttendanceSaveNotificationTemplates = {
  present: DEFAULT_EVALUATED_ATTENDANCE_TEMPLATE,
  late: DEFAULT_EVALUATED_ATTENDANCE_TEMPLATE,
  absent: "تم حفظ تحضير الطالب {name} في حلقة {halaqah} بتاريخ {date} بحالة {status}.",
  excused: "تم حفظ تحضير الطالب {name} في حلقة {halaqah} بتاريخ {date} بحالة {status}.",
}

type TemplateParams = {
  studentName: string
  halaqah?: string | null
  date: string
  status: string
  hafiz?: string
  hafizEvaluation?: string
  hafizAmount?: string
  tikrar?: string
  samaa?: string
  rabet?: string
}

export function normalizeAttendanceSaveNotificationTemplates(value: unknown): AttendanceSaveNotificationTemplates {
  const candidate = value && typeof value === "object" ? (value as Partial<AttendanceSaveNotificationTemplates>) : {}

  const normalizeEvaluatedTemplate = (template: unknown) => {
    if (typeof template !== "string" || !template.trim()) {
      return DEFAULT_EVALUATED_ATTENDANCE_TEMPLATE
    }

    const normalizedTemplate = template.trim()
    return LEGACY_PRESENT_LATE_DEFAULTS.has(normalizedTemplate)
      ? DEFAULT_EVALUATED_ATTENDANCE_TEMPLATE
      : normalizedTemplate
  }

  return {
    present: normalizeEvaluatedTemplate(candidate.present),
    late: normalizeEvaluatedTemplate(candidate.late),
    absent: typeof candidate.absent === "string" && candidate.absent.trim() ? candidate.absent.trim() : DEFAULT_ATTENDANCE_SAVE_NOTIFICATION_TEMPLATES.absent,
    excused: typeof candidate.excused === "string" && candidate.excused.trim() ? candidate.excused.trim() : DEFAULT_ATTENDANCE_SAVE_NOTIFICATION_TEMPLATES.excused,
  }
}

export function fillAttendanceSaveNotificationTemplate(template: string, params: TemplateParams) {
  return template
    .replaceAll("{name}", params.studentName)
    .replaceAll("{halaqah}", params.halaqah || "")
    .replaceAll("{date}", params.date)
    .replaceAll("{status}", params.status)
    .replaceAll("{hafiz}", params.hafiz || params.hafizEvaluation || "-")
    .replaceAll("{hafiz_evaluation}", params.hafizEvaluation || params.hafiz || "-")
    .replaceAll("{hafiz_amount}", params.hafizAmount || "-")
    .replaceAll("{tikrar}", params.tikrar || "-")
    .replaceAll("{tikrar_evaluation}", params.tikrar || "-")
    .replaceAll("{samaa}", params.samaa || "-")
    .replaceAll("{samaa_evaluation}", params.samaa || "-")
    .replaceAll("{rabet}", params.rabet || "-")
    .replaceAll("{rabet_evaluation}", params.rabet || "-")
}