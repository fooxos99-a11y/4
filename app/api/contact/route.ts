import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Rate limiting: Store last submission time per IP
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_DURATION = 60 * 60 * 1000 // 1 hour in milliseconds

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, subject, message } = body

    // Validate required fields
    if (!name || !subject || !message) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 })
    }

    // Get client IP address for rate limiting
    const forwardedFor = request.headers.get("x-forwarded-for")
    const realIp = request.headers.get("x-real-ip")
    const clientIp = forwardedFor?.split(",")[0] || realIp || "unknown"

    // Check rate limit
    const now = Date.now()
    const lastSubmission = rateLimitMap.get(clientIp)

    if (lastSubmission && now - lastSubmission < RATE_LIMIT_DURATION) {
      const remainingTime = Math.ceil((RATE_LIMIT_DURATION - (now - lastSubmission)) / 60000) // in minutes
      return NextResponse.json(
        { error: `يرجى الانتظار ${remainingTime} دقيقة قبل إرسال رسالة أخرى` },
        { status: 429 }
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("contact_messages")
      .insert({
        name,
        subject,
        message,
        status: "unread",
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json({ error: "حدث خطأ أثناء حفظ الرسالة" }, { status: 500 })
    }

    // Update rate limit map
    rateLimitMap.set(clientIp, now)

    // Clean up old entries (older than 1 hour)
    for (const [ip, timestamp] of rateLimitMap.entries()) {
      if (now - timestamp > RATE_LIMIT_DURATION) {
        rateLimitMap.delete(ip)
      }
    }

    return NextResponse.json({ success: true, message: "تم إرسال رسالتك بنجاح", data }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error submitting contact form:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء إرسال الرسالة" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: messages, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json({ error: "حدث خطأ أثناء جلب الرسائل" }, { status: 500 })
    }

    return NextResponse.json({ messages: messages || [] }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error fetching contact messages:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء جلب الرسائل" }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: "المعرف والحالة مطلوبان" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.from("contact_messages").update({ status }).eq("id", id).select().single()

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json({ error: "حدث خطأ أثناء تحديث الرسالة" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error updating message:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء تحديث الرسالة" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "المعرف مطلوب" }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await supabase.from("contact_messages").delete().eq("id", id)

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json({ error: "حدث خطأ أثناء حذف الرسالة" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error deleting message:", error)
    return NextResponse.json({ error: "حدث خطأ أثناء حذف الرسالة" }, { status: 500 })
  }
}
