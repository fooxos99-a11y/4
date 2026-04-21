import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRoles } from "@/lib/auth/guards"
import { insertNotificationsAndSendPush } from "@/lib/push-notifications"
import { getSaudiDateString } from "@/lib/saudi-time"
import { getSiteSetting } from "@/lib/site-settings"
import { enqueueWhatsAppMessage } from "@/lib/whatsapp-queue"
import {
  calculateRecitationDayPortionGrade,
  DEFAULT_RECITATION_DAY_GRADING_SETTINGS_VALUE,
  normalizeRecitationDayGradingSettings,
  RECITATION_DAY_GRADING_SETTINGS_ID,
} from "@/lib/recitation-day-grading-settings"
import {
  DEFAULT_RECITATION_DAY_NOTIFICATION_TEMPLATES,
  fillRecitationDayNotificationTemplate,
  normalizeRecitationDayNotificationTemplates,
  RECITATION_DAY_NOTIFICATION_SETTINGS_ID,
} from "@/lib/recitation-day-notification-templates"

function deriveOverallStatus(portionStatuses: string[]) {
  if (portionStatuses.length === 0 || portionStatuses.every((status) => status === "not_listened")) {
    return "not_listened"
  }

  if (portionStatuses.every((status) => status === "completed")) {
    return "completed"
  }

  return "partial"
}

function calculateStudentTotals(portions: Array<{ status?: string | null; grade?: number | null; errors_count?: number | null; alerts_count?: number | null }>) {
  const portionCount = portions.length
  const totalGrade = portions.reduce((sum, portion) => sum + (Number(portion.grade) || 0), 0)
  const grade = portionCount > 0 ? Number((totalGrade / portionCount).toFixed(2)) : null
  const errors = portions.reduce((sum, portion) => sum + Math.max(0, Number(portion.errors_count || 0)), 0)
  const alerts = portions.reduce((sum, portion) => sum + Math.max(0, Number(portion.alerts_count || 0)), 0)
  const overallStatus = deriveOverallStatus(portions.map((portion) => String(portion.status || "not_listened")))

  return {
    grade,
    errors_count: errors,
    alerts_count: alerts,
    overall_status: overallStatus,
  }
}

function normalizePortionDrafts(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as Array<{ id: string; errors_count: number; alerts_count: number; notes: string | null }>
  }

  return value.map((portion) => {
    const candidate = portion as Record<string, unknown>
    return {
      id: String(candidate.id || "").trim(),
      errors_count: Math.max(0, Number(candidate.errors_count || 0)),
      alerts_count: Math.max(0, Number(candidate.alerts_count || 0)),
      notes: String(candidate.notes || "").trim() || null,
    }
  })
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(request, ["admin", "supervisor"])
  if ("response" in auth) {
    return auth.response
  }

  const { session } = auth
  const { id } = await context.params
  const body = await request.json()
  const supabase = createAdminClient()
  const gradingSettings = normalizeRecitationDayGradingSettings(
    await getSiteSetting(RECITATION_DAY_GRADING_SETTINGS_ID, DEFAULT_RECITATION_DAY_GRADING_SETTINGS_VALUE),
  )

  const evaluatorName = String(body.evaluator_name || session.name || "").trim()
  if (!evaluatorName) {
    return NextResponse.json({ error: "اسم المقيّم مطلوب قبل حفظ التقييم" }, { status: 400 })
  }

  const portionDrafts = normalizePortionDrafts(body.portions)
  if (portionDrafts.length === 0) {
    return NextResponse.json({ error: "لا توجد أجزاء لحفظ تقييمها" }, { status: 400 })
  }

  const invalidPortion = portionDrafts.find((portion) => !portion.id)
  if (invalidPortion) {
    return NextResponse.json({ error: "يجب إدخال درجة لكل جزء قبل حفظ التقييم النهائي" }, { status: 400 })
  }

  const { data: studentRow, error: studentRowError } = await supabase
    .from("recitation_day_students")
    .select("id, student_id, student_name, account_number, halaqah, recitation_day_id")
    .eq("id", id)
    .single()

  if (studentRowError || !studentRow) {
    return NextResponse.json({ error: studentRowError?.message || "تعذر العثور على الطالب" }, { status: 404 })
  }

  const { data: existingPortions, error: existingPortionsError } = await supabase
    .from("recitation_day_portions")
    .select("id")
    .eq("recitation_day_student_id", id)

  if (existingPortionsError) {
    return NextResponse.json({ error: existingPortionsError.message || "تعذر جلب أجزاء السرد" }, { status: 500 })
  }

  const existingPortionIds = new Set((existingPortions || []).map((portion) => String(portion.id)))
  if (portionDrafts.some((portion) => !existingPortionIds.has(portion.id))) {
    return NextResponse.json({ error: "بعض أجزاء السرد غير صالحة أو لم تعد موجودة" }, { status: 400 })
  }

  for (const portion of portionDrafts) {
    const nextGrade = calculateRecitationDayPortionGrade({
      errorsCount: portion.errors_count,
      alertsCount: portion.alerts_count,
      settings: gradingSettings,
    })

    const { error: updatePortionError } = await supabase
      .from("recitation_day_portions")
      .update({
        status: "completed",
        evaluator_name: evaluatorName,
        heard_amount_text: null,
        grade: nextGrade,
        errors_count: portion.errors_count,
        alerts_count: portion.alerts_count,
        notes: portion.notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", portion.id)

    if (updatePortionError) {
      return NextResponse.json({ error: updatePortionError.message || "تعذر تحديث أحد أجزاء السرد" }, { status: 500 })
    }
  }

  const { data: portions, error: portionsError } = await supabase
    .from("recitation_day_portions")
    .select("id, status, grade, errors_count, alerts_count, notes, evaluator_name")
    .eq("recitation_day_student_id", id)

  if (portionsError) {
    return NextResponse.json({ error: portionsError.message || "تعذر احتساب حالة السرد" }, { status: 500 })
  }

  const totals = calculateStudentTotals(portions || [])

  const payload = {
    overall_status: totals.overall_status,
    evaluator_name: evaluatorName,
    heard_amount_text: null,
    grade: totals.grade,
    errors_count: totals.errors_count,
    alerts_count: totals.alerts_count,
    notes: String(body.notes || "").trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("recitation_day_students")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message || "تعذر تحديث تقييم الطالب" }, { status: 500 })
  }

  const notificationTemplates = normalizeRecitationDayNotificationTemplates(
    await getSiteSetting(RECITATION_DAY_NOTIFICATION_SETTINGS_ID, DEFAULT_RECITATION_DAY_NOTIFICATION_TEMPLATES),
  )

  const gradeText = totals.grade ?? 0
  const notificationMessage = fillRecitationDayNotificationTemplate(notificationTemplates.app, {
    studentName: studentRow.student_name || "الطالب",
    halaqah: studentRow.halaqah,
    evaluatorName,
    grade: gradeText,
    errors: totals.errors_count,
    alerts: totals.alerts_count,
    date: getSaudiDateString(),
  })

  if (studentRow.account_number) {
    try {
      await insertNotificationsAndSendPush(supabase, [{
        user_account_number: String(studentRow.account_number),
        message: notificationMessage,
        url: "/notifications",
        tag: `recitation-day-evaluation-${studentRow.recitation_day_id}-${studentRow.id}`,
      }])
    } catch (notificationError) {
      const message = notificationError instanceof Error ? notificationError.message : "تعذر إرسال تنبيه الطالب"
      return NextResponse.json({ error: message || "تعذر إرسال تنبيه الطالب" }, { status: 500 })
    }
  }

  const { data: studentContact } = await supabase
    .from("students")
    .select("guardian_phone")
    .eq("id", studentRow.student_id)
    .maybeSingle()

  const whatsappMessage = fillRecitationDayNotificationTemplate(notificationTemplates.whatsapp, {
    studentName: studentRow.student_name || "الطالب",
    halaqah: studentRow.halaqah,
    evaluatorName,
    grade: gradeText,
    errors: totals.errors_count,
    alerts: totals.alerts_count,
    date: getSaudiDateString(),
  })

  await enqueueWhatsAppMessage(supabase, {
    phoneNumber: studentContact?.guardian_phone,
    message: whatsappMessage,
    userId: session.id,
    dedupeDate: getSaudiDateString(),
  })

  return NextResponse.json({
    student: {
      ...data,
      portions: portions || [],
    },
  })
}