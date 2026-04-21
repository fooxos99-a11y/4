import { NextResponse } from "next/server"

import { isTeacherRole, requireRoles } from "@/lib/auth/guards"
import { insertNotificationsAndSendPush } from "@/lib/push-notifications"
import { createAdminClient } from "@/lib/supabase/admin"

function normalizeHalaqah(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase()
}

function isValidAccountNumber(value: string) {
  return /^\d+$/.test(value)
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
    const notifications = Array.isArray(body?.notifications) ? body.notifications : []
    const normalizedNotifications = notifications
      .map((notification) => ({
        user_account_number: String(notification?.user_account_number || "").trim(),
        message: String(notification?.message || "").trim(),
      }))
      .filter((notification) => notification.user_account_number && notification.message)

    if (normalizedNotifications.length === 0) {
      return NextResponse.json({ error: "لا توجد إشعارات صالحة للإرسال" }, { status: 400 })
    }

    if (normalizedNotifications.some((notification) => !isValidAccountNumber(notification.user_account_number))) {
      return NextResponse.json({ error: "رقم الحساب غير صالح في أحد الإشعارات" }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (isTeacherRole(auth.session.role)) {
      const targetAccountNumbers = Array.from(
        new Set(normalizedNotifications.map((notification) => Number(notification.user_account_number)).filter(Number.isFinite)),
      )

      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("account_number, halaqah")
        .in("account_number", targetAccountNumbers)

      if (studentsError) {
        throw studentsError
      }

      if (!students || students.length !== targetAccountNumbers.length) {
        return NextResponse.json({ error: "يمكن للمعلم إرسال إشعارات لطلابه فقط" }, { status: 403 })
      }

      const sessionHalaqah = normalizeHalaqah(auth.session.halaqah)
      const hasOutsideScopeStudent = students.some(
        (student) => normalizeHalaqah(student.halaqah) !== sessionHalaqah,
      )

      if (hasOutsideScopeStudent) {
        return NextResponse.json({ error: "لا يمكنك إرسال إشعارات إلى طلاب حلقة أخرى" }, { status: 403 })
      }
    }

    await insertNotificationsAndSendPush(supabase, normalizedNotifications)

    return NextResponse.json({ success: true, count: normalizedNotifications.length })
  } catch (error) {
    console.error("[notifications] POST:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
