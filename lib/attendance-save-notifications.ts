import { getSiteSetting } from "@/lib/site-settings"
import { formatQuranRange } from "@/lib/quran-data"
import {
  ATTENDANCE_SAVE_NOTIFICATION_SETTINGS_ID,
  type AttendanceSaveNotificationTemplates,
  DEFAULT_ATTENDANCE_SAVE_NOTIFICATION_TEMPLATES,
  fillAttendanceSaveNotificationTemplate,
  normalizeAttendanceSaveNotificationTemplates,
} from "@/lib/attendance-save-notification-templates"
import { enqueueWhatsAppMessage } from "@/lib/whatsapp-queue"
import { translateAttendanceStatus, type EvaluationLevelValue } from "@/lib/student-attendance"

type SupabaseLike = {
  from: (table: string) => any
}

type AttendanceNotificationParams = {
  supabase: SupabaseLike
  studentId: string
  date: string
  status: string
  performedByUserId?: string | null
  evaluation?: {
    hafiz?: EvaluationLevelValue
    tikrar?: EvaluationLevelValue
    samaa?: EvaluationLevelValue
    rabet?: EvaluationLevelValue
  }
  hafizAmount?: string | null
  templates?: AttendanceSaveNotificationTemplates
  studentData?: {
    name?: string | null
    halaqah?: string | null
    guardian_phone?: string | null
  } | null
}

const EVALUATION_LEVEL_LABELS: Record<string, string> = {
  excellent: "ممتاز",
  very_good: "جيد جدًا",
  good: "جيد",
  not_completed: "لم يكمل",
}

function translateEvaluationLevel(level: EvaluationLevelValue) {
  if (!level) {
    return "-"
  }

  return EVALUATION_LEVEL_LABELS[level] || String(level)
}

async function buildAttendanceGuardianMessage(params: {
  studentName: string
  halaqah?: string | null
  date: string
  status: string
  evaluation?: AttendanceNotificationParams["evaluation"]
  hafizAmount?: string | null
  templates?: AttendanceSaveNotificationTemplates
}) {
  const statusLabel = translateAttendanceStatus(params.status) || params.status || "غير محدد"
  const templates = params.templates || await loadAttendanceSaveGuardianTemplates()

  const template = templates[params.status as keyof typeof templates] || templates.present

  return fillAttendanceSaveNotificationTemplate(template, {
    studentName: params.studentName,
    halaqah: params.halaqah,
    date: params.date,
    status: statusLabel,
    hafiz: translateEvaluationLevel(params.evaluation?.hafiz),
    hafizEvaluation: translateEvaluationLevel(params.evaluation?.hafiz),
    hafizAmount: params.hafizAmount?.trim() || "-",
    tikrar: translateEvaluationLevel(params.evaluation?.tikrar),
    samaa: translateEvaluationLevel(params.evaluation?.samaa),
    rabet: translateEvaluationLevel(params.evaluation?.rabet),
  })
}

export async function loadAttendanceSaveGuardianTemplates() {
  return normalizeAttendanceSaveNotificationTemplates(
    await getSiteSetting(
      ATTENDANCE_SAVE_NOTIFICATION_SETTINGS_ID,
      DEFAULT_ATTENDANCE_SAVE_NOTIFICATION_TEMPLATES,
    ),
  )
}

export async function sendAttendanceSaveGuardianNotification(params: AttendanceNotificationParams) {
  const studentData = params.studentData || null
  let resolvedStudent = studentData

  if (!resolvedStudent) {
    const { data, error: studentError } = await params.supabase
      .from("students")
      .select("name, halaqah, guardian_phone")
      .eq("id", params.studentId)
      .maybeSingle()

    if (studentError) {
      throw studentError
    }

    resolvedStudent = data
  }

  if (!resolvedStudent?.guardian_phone) {
    return { queued: false, reason: "missing-guardian-phone" as const }
  }

  const message = await buildAttendanceGuardianMessage({
    studentName: resolvedStudent.name || "الطالب",
    halaqah: resolvedStudent.halaqah,
    date: params.date,
    status: params.status,
    evaluation: params.evaluation,
    hafizAmount: params.hafizAmount,
    templates: params.templates,
  })

  return enqueueWhatsAppMessage(params.supabase, {
    phoneNumber: resolvedStudent.guardian_phone,
    message,
    userId: params.performedByUserId || null,
    dedupeDate: params.date,
  })
}

export function buildHafizAmountLabel(reading?: {
  fromSurah?: string | null
  fromVerse?: string | null
  toSurah?: string | null
  toVerse?: string | null
}) {
  return formatQuranRange(reading?.fromSurah, reading?.fromVerse, reading?.toSurah, reading?.toVerse)
}