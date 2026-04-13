import { normalizeWhatsAppPhoneNumber } from "@/lib/phone-number"
import { requireRoles } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

type WhatsAppReplyRow = {
  id: string
  from_phone: string
  message_text: string
  reply_type?: string | null
  media_mime_type?: string | null
  media_base64?: string | null
  timestamp: number | null
  received_at: string | null
  is_read: boolean
  original_message_id: string | null
}

type WhatsAppMessageRow = {
  id: string
  phone_number: string
  message_text: string
  message_type?: string | null
  media_mime_type?: string | null
  media_base64?: string | null
  created_at: string | null
}

type StudentRow = {
  id: string
  name: string
  guardian_phone: string | null
}

function normalizePhoneForMatching(phone: string | null | undefined) {
  if (!phone) {
    return null
  }

  try {
    return normalizeWhatsAppPhoneNumber(phone)
  } catch {
    return String(phone).replace(/\D/g, "") || null
  }
}

function getReplyDate(reply: Pick<WhatsAppReplyRow, "timestamp" | "received_at">) {
  if (typeof reply.timestamp === "number" && Number.isFinite(reply.timestamp)) {
    return new Date(reply.timestamp * 1000)
  }

  if (reply.received_at) {
    return new Date(reply.received_at)
  }

  return null
}

function getMessageDate(message: Pick<WhatsAppMessageRow, "created_at">) {
  return message.created_at ? new Date(message.created_at) : null
}

function sortRepliesByOldest(a: WhatsAppReplyRow, b: WhatsAppReplyRow) {
  const aDate = getReplyDate(a)
  const bDate = getReplyDate(b)

  if (!aDate && !bDate) return 0
  if (!aDate) return 1
  if (!bDate) return -1

  return aDate.getTime() - bDate.getTime()
}

function sortRepliesByNewest(a: { reply_at: string | null }, b: { reply_at: string | null }) {
  const aTime = a.reply_at ? new Date(a.reply_at).getTime() : 0
  const bTime = b.reply_at ? new Date(b.reply_at).getTime() : 0

  return bTime - aTime
}

function pickOriginalMessage(
  reply: WhatsAppReplyRow,
  messagesForPhone: WhatsAppMessageRow[],
  messageById: Map<string, WhatsAppMessageRow>
) {
  if (reply.original_message_id) {
    const directMessage = messageById.get(reply.original_message_id)
    if (directMessage) {
      return directMessage
    }
  }

  const replyDate = getReplyDate(reply)
  if (!replyDate) {
    return messagesForPhone[0] || null
  }

  for (const message of messagesForPhone) {
    const messageDate = getMessageDate(message)
    if (!messageDate || messageDate.getTime() <= replyDate.getTime()) {
      return message
    }
  }

  return messagesForPhone[0] || null
}

/**
 * GET /api/whatsapp/replies
 * الحصول على قائمة الردود المستلمة
 */
export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread_only") === "true"
    const limit = parseInt(searchParams.get("limit") || "100")

    const supabase = createAdminClient()

    const buildRepliesQuery = (selectClause: string) => {
      let query = supabase
        .from("whatsapp_replies")
        .select(selectClause)
        .order("received_at", { ascending: false })
        .limit(Math.max(limit * 10, 300))

      if (unreadOnly) {
        query = query.eq("is_read", false)
      }

      return query
    }

    let { data: replies, error } = await buildRepliesQuery("id, from_phone, message_text, reply_type, media_mime_type, media_base64, timestamp, received_at, is_read, original_message_id")

    if (error && (error.code === "42703" || error.code === "PGRST204")) {
      const legacyResult = await buildRepliesQuery("id, from_phone, message_text, timestamp, received_at, is_read, original_message_id")
      replies = legacyResult.data
      error = legacyResult.error
    }

    if (error) {
      console.error("[WhatsApp] Error fetching replies:", error)
      return NextResponse.json(
        { error: "فشل في جلب الردود" },
        { status: 500 }
      )
    }

    const replyRows = (replies || []) as WhatsAppReplyRow[]
    const replyPhones = Array.from(new Set(replyRows.map((reply) => normalizePhoneForMatching(reply.from_phone)).filter(Boolean))) as string[]

    const buildMessagesQuery = (selectClause: string) => {
      if (replyPhones.length === 0) {
        return Promise.resolve({ data: [], error: null })
      }

      return supabase
        .from("whatsapp_messages")
        .select(selectClause)
        .in("phone_number", replyPhones)
        .order("created_at", { ascending: false })
    }

    const [{ data: students, error: studentsError }, messagesResult] = await Promise.all([
      supabase.from("students").select("id, name, guardian_phone"),
      buildMessagesQuery("id, phone_number, message_text, message_type, media_mime_type, media_base64, created_at"),
    ])

    let messages = messagesResult.data
    let messagesError = messagesResult.error

    if (messagesError && (messagesError.code === "42703" || messagesError.code === "PGRST204")) {
      const legacyMessagesResult = await buildMessagesQuery("id, phone_number, message_text, created_at")
      messages = legacyMessagesResult.data
      messagesError = legacyMessagesResult.error
    }

    if (studentsError) {
      console.error("[WhatsApp] Error fetching students for replies:", studentsError)
      return NextResponse.json(
        { error: "فشل في جلب بيانات الطلاب" },
        { status: 500 }
      )
    }

    if (messagesError) {
      console.error("[WhatsApp] Error fetching sent messages for replies:", messagesError)
      return NextResponse.json(
        { error: "فشل في جلب الرسائل المرسلة" },
        { status: 500 }
      )
    }

    const studentByPhone = new Map<string, StudentRow>()
    for (const student of ((students || []) as StudentRow[])) {
      const normalizedPhone = normalizePhoneForMatching(student.guardian_phone)
      if (normalizedPhone && !studentByPhone.has(normalizedPhone)) {
        studentByPhone.set(normalizedPhone, student)
      }
    }

    const messagesByPhone = new Map<string, WhatsAppMessageRow[]>()
    const messageById = new Map<string, WhatsAppMessageRow>()
    for (const message of ((messages || []) as WhatsAppMessageRow[])) {
      const normalizedPhone = normalizePhoneForMatching(message.phone_number)
      if (!normalizedPhone) {
        continue
      }

      const phoneMessages = messagesByPhone.get(normalizedPhone) || []
      phoneMessages.push(message)
      messagesByPhone.set(normalizedPhone, phoneMessages)
      messageById.set(message.id, message)
    }

    const firstReplyByMessage = new Map<string, { normalizedPhone: string; reply: WhatsAppReplyRow; originalMessage: WhatsAppMessageRow }>()

    for (const reply of [...replyRows].sort(sortRepliesByOldest)) {
      const normalizedPhone = normalizePhoneForMatching(reply.from_phone)
      if (!normalizedPhone) {
        continue
      }

      const originalMessage = pickOriginalMessage(reply, messagesByPhone.get(normalizedPhone) || [], messageById)
      if (!originalMessage?.id) {
        continue
      }

      if (firstReplyByMessage.has(originalMessage.id)) {
        continue
      }

      firstReplyByMessage.set(originalMessage.id, {
        normalizedPhone,
        reply,
        originalMessage,
      })
    }

    const summarizedReplies = Array.from(firstReplyByMessage.values())
      .map(({ normalizedPhone, reply, originalMessage }) => {
        const student = studentByPhone.get(normalizedPhone)
        const replyDate = getReplyDate(reply)

        return {
          id: reply.id,
          from_phone: reply.from_phone,
          student_id: student?.id || null,
          student_name: student?.name || "غير معروف",
          sent_message_text: originalMessage.message_text,
          sent_message_type: originalMessage.message_type || "text",
          sent_media_mime_type: originalMessage.media_mime_type || null,
          sent_media_base64: originalMessage.media_base64 || null,
          reply_message_text: reply.message_text,
          reply_type: reply.reply_type || "text",
          media_mime_type: reply.media_mime_type || null,
          media_base64: reply.media_base64 || null,
          reply_at: replyDate?.toISOString() || reply.received_at || null,
          is_read: reply.is_read,
        }
      })
      .filter((reply) => !unreadOnly || !reply.is_read)
      .sort(sortRepliesByNewest)
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      replies: summarizedReplies,
      count: summarizedReplies.length,
      unreadCount: summarizedReplies.filter((reply) => !reply.is_read).length,
    })
  } catch (error) {
    console.error("[WhatsApp] Get replies error:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الردود" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/whatsapp/replies
 * تحديث حالة القراءة للرد
 */
export async function PATCH(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json()
    const replyId = body.replyId || body.id
    const isRead = typeof body.isRead === "boolean" ? body.isRead : body.is_read

    if (!replyId) {
      return NextResponse.json(
        { error: "معرف الرد مطلوب" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("whatsapp_replies")
      .update({ is_read: isRead })
      .eq("id", replyId)
      .select()
      .single()

    if (error) {
      console.error("[WhatsApp] Error updating reply:", error)
      return NextResponse.json(
        { error: "فشل في تحديث الرد" },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      reply: data,
      message: "تم تحديث حالة القراءة" 
    })
  } catch (error) {
    console.error("[WhatsApp] Update reply error:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الرد" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/whatsapp/replies
 * حذف رد وارد
 */
export async function DELETE(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json().catch(() => ({}))
    const replyId = body.replyId || body.id

    if (!replyId) {
      return NextResponse.json(
        { error: "معرف الرد مطلوب" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { error } = await supabase
      .from("whatsapp_replies")
      .delete()
      .eq("id", replyId)

    if (error) {
      console.error("[WhatsApp] Error deleting reply:", error)
      return NextResponse.json(
        { error: "فشل في حذف الرد" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[WhatsApp] Delete reply error:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء حذف الرد" },
      { status: 500 }
    )
  }
}
