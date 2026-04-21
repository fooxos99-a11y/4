import { NextResponse } from "next/server"
import { requireRoles } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { readWhatsAppWorkerStatus } from "@/lib/whatsapp-worker-status"
import { WHATSAPP_WORKER_COMMAND_SETTING_ID } from "@/lib/whatsapp-site-config"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST(request: Request) {
  const auth = await requireRoles(request, ["admin", "supervisor"])
  if ("response" in auth) {
    return auth.response
  }

  try {
    const status = await readWhatsAppWorkerStatus()
    const workerOnline = Boolean(status.workerOnline)

    if (!workerOnline) {
      return NextResponse.json({ error: "عامل واتساب غير متصل حالياً" }, { status: 409 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from("site_settings").upsert(
      {
        id: WHATSAPP_WORKER_COMMAND_SETTING_ID,
        value: { action: "disconnect", requestedAt: new Date().toISOString() },
      },
      { onConflict: "id" },
    )

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, message: "تم إرسال طلب إلغاء الربط" })
  } catch (error) {
    console.error("[WhatsApp] Disconnect error:", error)
    return NextResponse.json({ error: "تعذر إلغاء الربط حالياً" }, { status: 500 })
  }
}