import { NextResponse } from "next/server"

import { ensureStudentAccess, requireRoles } from "@/lib/auth/guards"
import { insertNotificationsAndSendPush } from "@/lib/push-notifications"
import { formatExamPortionLabel } from "@/lib/student-exams"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildExamAppNotificationMessage, getExamWhatsAppTemplates } from "@/lib/whatsapp-notification-templates"

function formatScheduledDate(dateValue: string) {
  const [year, month, day] = String(dateValue || "").split("-")
  if (!year || !month || !day) {
    return ""
  }

  return `${year}/${month}/${day}`
}

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json()
    const studentId = String(body.student_id || "").trim()
    const juzNumber = Number(body.juz_number)
    const examDate = String(body.exam_date || "").trim()

    if (!studentId) {
      return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 })
    }

    if (!Number.isInteger(juzNumber) || juzNumber < 1 || juzNumber > 30) {
      return NextResponse.json({ error: "رقم الجزء غير صالح" }, { status: 400 })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      return NextResponse.json({ error: "تاريخ الاختبار غير صالح" }, { status: 400 })
    }

    const { session } = auth
    const supabase = createAdminClient()
    const studentAccess = await ensureStudentAccess(supabase, session, studentId)

    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const student = studentAccess.student as { name?: string | null; account_number?: number | string | null; halaqah?: string | null }
    const accountNumber = String(student.account_number || "").trim()
    if (!accountNumber) {
      return NextResponse.json({ error: "لا يمكن إرسال التنبيه لأن رقم حساب الطالب غير موجود" }, { status: 400 })
    }

    const portionLabel = formatExamPortionLabel(juzNumber, `الجزء ${juzNumber}`)
    const scheduledDate = formatScheduledDate(examDate)
    const examTemplates = await getExamWhatsAppTemplates(supabase)
    const message = buildExamAppNotificationMessage("create", {
      studentName: student.name || "الطالب",
      date: scheduledDate,
      portion: portionLabel,
      halaqah: student.halaqah,
    }, examTemplates)

    await insertNotificationsAndSendPush(supabase, [{
      user_account_number: accountNumber,
      message,
      url: "/exams",
      tag: `exam-schedule-${studentId}-${examDate}`,
    }])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[exam-notifications] POST:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}