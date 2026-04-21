import { NextResponse } from "next/server"
import { readWhatsAppWorkerStatus } from "@/lib/whatsapp-worker-status"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    return NextResponse.json(await readWhatsAppWorkerStatus())
  } catch (error) {
    console.error("[WhatsApp] Status error:", error)
    return NextResponse.json({ error: "تعذر قراءة حالة واتساب" }, { status: 500 })
  }
}