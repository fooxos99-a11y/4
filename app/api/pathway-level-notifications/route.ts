import { NextResponse } from "next/server"

import { requireRoles } from "@/lib/auth/guards"
import {
  DEFAULT_PATHWAY_LEVEL_NOTIFICATION_TEMPLATES,
  fillPathwayLevelNotificationTemplate,
  normalizePathwayLevelNotificationTemplates,
  PATHWAY_LEVEL_NOTIFICATION_SETTINGS_ID,
} from "@/lib/pathway-notification-templates"
import { insertNotificationsAndSendPush } from "@/lib/push-notifications"
import { getSiteSetting } from "@/lib/site-settings"
import { createAdminClient } from "@/lib/supabase/admin"

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
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json()
    const levelNumber = Number(body?.level_number)
    const halaqah = String(body?.halaqah || "").trim()

    if (!halaqah || !Number.isInteger(levelNumber) || levelNumber <= 0) {
      return NextResponse.json({ error: "بيانات المستوى غير مكتملة" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: level, error: levelError } = await supabase
      .from("pathway_levels")
      .select("id, level_number, title, halaqah")
      .eq("level_number", levelNumber)
      .eq("halaqah", halaqah)
      .maybeSingle()

    if (levelError) {
      throw levelError
    }

    if (!level?.id) {
      return NextResponse.json({ error: "المستوى غير موجود" }, { status: 404 })
    }

    const [{ count: contentCount, error: contentError }, { count: quizCount, error: quizError }] = await Promise.all([
      supabase
        .from("pathway_contents")
        .select("id", { count: "exact", head: true })
        .eq("level_id", levelNumber)
        .eq("halaqah", halaqah),
      supabase
        .from("pathway_level_questions")
        .select("id", { count: "exact", head: true })
        .eq("level_number", levelNumber)
        .eq("halaqah", halaqah),
    ])

    if (contentError) {
      throw contentError
    }

    if (quizError) {
      throw quizError
    }

    if ((contentCount || 0) === 0 || (quizCount || 0) === 0) {
      return NextResponse.json({ error: "لن يتم إرسال التنبيه حتى يتم إضافة محتوى وسؤال واحد على الأقل لهذا المستوى" }, { status: 400 })
    }

    const templates = normalizePathwayLevelNotificationTemplates(
      await getSiteSetting(PATHWAY_LEVEL_NOTIFICATION_SETTINGS_ID, DEFAULT_PATHWAY_LEVEL_NOTIFICATION_TEMPLATES),
    )
    const notificationMessage = fillPathwayLevelNotificationTemplate(templates.publish, {
      halaqah,
      levelTitle: String(level.title || `المستوى ${levelNumber}`),
      levelNumber,
    })

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("account_number")
      .eq("halaqah", halaqah)
      .not("account_number", "is", null)

    if (studentsError) {
      throw studentsError
    }

    const notifications = (students || [])
      .map((student) => String(student.account_number || "").trim())
      .filter(Boolean)
      .map((accountNumber) => ({
        user_account_number: accountNumber,
        message: notificationMessage,
        url: "/pathways",
        tag: `pathway-level-publish-${halaqah}-${levelNumber}`,
      }))

    if (notifications.length === 0) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    await insertNotificationsAndSendPush(supabase, notifications)

    return NextResponse.json({ success: true, sent: notifications.length })
  } catch (error) {
    console.error("[pathway-level-notifications] POST:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}