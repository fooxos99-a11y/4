import { NextResponse } from "next/server"

/**
 * GET /api/whatsapp/stats
 * الحصول على إحصائيات WhatsApp
 */
export async function GET() {
  try {
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    // استدعاء الدالة من قاعدة البيانات
    const { data, error } = await supabase.rpc("get_whatsapp_stats")

    if (error) {
      console.error("[WhatsApp] Error fetching stats:", error)
      return NextResponse.json(
        { error: "فشل في جلب الإحصائيات" },
        { status: 500 }
      )
    }

    return NextResponse.json({ stats: data })
  } catch (error) {
    console.error("[WhatsApp] Get stats error:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الإحصائيات" },
      { status: 500 }
    )
  }
}
