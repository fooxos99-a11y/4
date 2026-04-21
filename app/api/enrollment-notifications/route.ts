import { NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { enqueueWhatsAppMessage } from "@/lib/whatsapp-queue"

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date())
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json().catch(() => ({}))
    const phoneNumber = String(body.phoneNumber || "").trim()
    const message = String(body.message || "").trim()

    if (!message) {
      return NextResponse.json({ error: "نص الرسالة مطلوب" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const result = await enqueueWhatsAppMessage(supabase, {
      phoneNumber,
      message,
      userId: auth.session.id,
      dedupeDate: getTodayDate(),
    })

    return NextResponse.json({ success: true, queued: result.queued, reason: result.reason ?? null })
  } catch (error) {
    const message = error instanceof Error ? error.message : "تعذر إرسال الرسالة"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}