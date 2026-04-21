import crypto from "node:crypto"
import { NextResponse } from "next/server"

function verifyWebhookSignature(rawBody: string, signatureHeader?: string | null) {
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET
  if (!appSecret) {
    return true
  }

  const providedSignature = String(signatureHeader || "").trim()
  if (!providedSignature.startsWith("sha256=")) {
    return false
  }

  const expectedSignature = `sha256=${crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")}`
  const providedBuffer = Buffer.from(providedSignature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}

/**
 * WhatsApp Cloud API - Webhook Endpoint
 * 
 * GET /api/whatsapp/webhook - للتحقق من الـ webhook (Verification)
 * POST /api/whatsapp/webhook - لاستقبال الرسائل والتحديثات
 */

/**
 * GET - Webhook Verification
 * Meta تستخدم هذا للتحقق من صحة الـ webhook
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    
    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

    console.log("[Webhook] Verification request:", { mode, token: token?.substring(0, 10) + "..." })

    // التحقق من الـ token
    if (mode === "subscribe" && token === verifyToken) {
      console.log("[Webhook] Verification successful")
      return new NextResponse(challenge, { status: 200 })
    }

    console.error("[Webhook] Verification failed")
    return NextResponse.json({ error: "Verification failed" }, { status: 403 })
  } catch (error) {
    console.error("[Webhook] Verification error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

/**
 * POST - استقبال الرسائل والتحديثات
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    if (!verifyWebhookSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
      console.error("[Webhook] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 })
    }

    const body = JSON.parse(rawBody)

    console.log("[Webhook] Received:", JSON.stringify(body, null, 2))

    // التحقق من وجود بيانات
    if (!body.entry || !Array.isArray(body.entry)) {
      return NextResponse.json({ status: "no data" })
    }

    // معالجة كل entry
    for (const entry of body.entry) {
      const changes = entry.changes || []

      for (const change of changes) {
        // التحقق من نوع التغيير
        if (change.field !== "messages") {
          continue
        }

        const value = change.value

        // معالجة الرسائل الواردة
        if (value.messages && Array.isArray(value.messages)) {
          for (const message of value.messages) {
            await handleIncomingMessage(message, value.metadata)
          }
        }

        // معالجة تحديثات الحالة (delivered, read, etc.)
        if (value.statuses && Array.isArray(value.statuses)) {
          for (const status of value.statuses) {
            await handleStatusUpdate(status)
          }
        }
      }
    }

    // إرسال رد سريع لـ WhatsApp
    return NextResponse.json({ status: "ok" })
  } catch (error) {
    console.error("[Webhook] Error:", error)
    return NextResponse.json({ status: "error" }, { status: 500 })
  }
}

/**
 * معالجة الرسالة الواردة
 */
async function handleIncomingMessage(message: any, metadata: any) {
  try {
    console.log("[Webhook] Processing message:", message.id)

    const messageData = {
      message_id: message.id,
      from_phone: message.from,
      message_text: extractMessageText(message),
      timestamp: parseInt(message.timestamp),
      is_read: false,
    }

    // حفظ في قاعدة البيانات
    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("whatsapp_replies")
      .insert(messageData)
      .select()
      .single()

    if (error) {
      // تجاهل أخطاء التكرار (duplicate message_id)
      if (error.code === "23505") {
        console.log("[Webhook] Duplicate message, skipping:", message.id)
        return
      }
      console.error("[Webhook] Database error:", error)
      return
    }

    console.log("[Webhook] Message saved:", data.id)

    // يمكن إضافة إشعارات هنا (مثل إرسال بريد إلكتروني أو push notification)
    
  } catch (error) {
    console.error("[Webhook] Error handling message:", error)
  }
}

/**
 * استخراج نص الرسالة حسب النوع
 */
function extractMessageText(message: any): string {
  if (message.type === "text") {
    return message.text?.body || ""
  }
  
  if (message.type === "image") {
    return `[صورة] ${message.image?.caption || ""}`
  }
  
  if (message.type === "video") {
    return `[فيديو] ${message.video?.caption || ""}`
  }
  
  if (message.type === "audio") {
    return "[رسالة صوتية]"
  }
  
  if (message.type === "document") {
    return `[مستند] ${message.document?.filename || ""}`
  }
  
  if (message.type === "location") {
    return `[موقع] ${message.location?.name || ""}`
  }
  
  return `[${message.type || "رسالة"}]`
}

/**
 * معالجة تحديثات حالة الرسالة
 */
async function handleStatusUpdate(status: any) {
  try {
    console.log("[Webhook] Status update:", status.id, "->", status.status)

    const { createClient } = await import("@/lib/supabase/server")
    const supabase = await createClient()

    // تحديث حالة الرسالة في قاعدة البيانات
    const { error } = await supabase
      .from("whatsapp_messages")
      .update({ status: status.status })
      .eq("message_id", status.id)

    if (error) {
      console.error("[Webhook] Error updating status:", error)
      return
    }

    console.log("[Webhook] Status updated successfully")
  } catch (error) {
    console.error("[Webhook] Error handling status:", error)
  }
}
