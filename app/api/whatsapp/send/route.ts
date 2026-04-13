import { createAdminClient } from "@/lib/supabase/admin"
import { requireRoles } from "@/lib/auth/guards"
import { normalizeWhatsAppPhoneNumber } from "@/lib/phone-number"
import { isWhatsAppWorkerReady, readWhatsAppWorkerStatus } from "@/lib/whatsapp-worker-status"

import { NextResponse } from "next/server"

const OUTBOUND_WHATSAPP_MEDIA_MIGRATION = "scripts/057_add_whatsapp_outbound_media_columns.sql"
const MAX_OUTBOUND_MEDIA_SIZE_BYTES = 50 * 1024 * 1024
const ALLOWED_OUTBOUND_MEDIA_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

type OutgoingMediaInput = {
  mimeType?: string | null
  base64?: string | null
  fileName?: string | null
}

type NormalizedOutgoingMedia = {
  mimeType: string
  base64: string
  fileName: string | null
}

type QueueMessageInput = {
  id: string
  phoneNumber: string
  message: string
  userId?: string
  media?: NormalizedOutgoingMedia | null
}

type BulkQueueRecipientInput = {
  phoneNumber?: string | null
  userId?: string | null
  message?: string | null
  media?: OutgoingMediaInput | null
}

async function insertWhatsAppHistoryRows(
  supabase: ReturnType<typeof createAdminClient>,
  rows: Array<{
    id: string
    phone_number: string
    message_text: string
    message_type: string
    media_mime_type: string | null
    media_base64: string | null
    media_file_name: string | null
    status: string
    sent_by: string | null
    sent_at: null
  }>,
  options?: { includesMedia?: boolean },
) {
  if (rows.length === 0) {
    return
  }

  const { error } = await supabase
    .from("whatsapp_messages")
    .insert(rows)

  if (!error || error.code === "42P01") {
    return
  }

  if (isMissingMediaColumnsError(error)) {
    if (options?.includesMedia) {
      throw new Error(`قاعدة البيانات لا تدعم إرسال الصور بعد. شغّل ملف ${OUTBOUND_WHATSAPP_MEDIA_MIGRATION} ثم أعد المحاولة.`)
    }

    const legacyRows = rows.map(stripOutboundMediaColumns)
    const { error: legacyError } = await supabase
      .from("whatsapp_messages")
      .insert(legacyRows)

    if (!legacyError || legacyError.code === "42P01") {
      return
    }

    if (legacyError.code !== "23503" && legacyError.code !== "22P02") {
      throw legacyError
    }

    const fallbackLegacyRows = legacyRows.map((row) => ({
      ...row,
      sent_by: null,
    }))

    const { error: fallbackLegacyError } = await supabase
      .from("whatsapp_messages")
      .insert(fallbackLegacyRows)

    if (fallbackLegacyError && fallbackLegacyError.code !== "42P01") {
      throw fallbackLegacyError
    }

    return
  }

  if (error.code !== "23503" && error.code !== "22P02") {
    throw error
  }

  const fallbackRows = rows.map((row) => ({
    ...row,
    sent_by: null,
  }))

  const { error: fallbackError } = await supabase
    .from("whatsapp_messages")
    .insert(fallbackRows)

  if (fallbackError && fallbackError.code !== "42P01") {
    throw fallbackError
  }
}

function stripOutboundMediaColumns<T extends {
  message_type?: string
  media_mime_type?: string | null
  media_base64?: string | null
  media_file_name?: string | null
}>(row: T) {
  const { message_type, media_mime_type, media_base64, media_file_name, ...legacyRow } = row
  return legacyRow
}

function isMissingMediaColumnsError(error: { code?: string | null } | null | undefined) {
  return error?.code === "42703" || error?.code === "PGRST204"
}

function sanitizeOutgoingMediaFileName(fileName: string | null | undefined) {
  const normalized = String(fileName || "").trim().replace(/[\\/]+/g, "-")
  return normalized ? normalized.slice(0, 120) : null
}

function normalizeBase64Payload(value: string) {
  const trimmed = value.trim()
  const base64Value = trimmed.includes(",") ? trimmed.slice(trimmed.indexOf(",") + 1) : trimmed
  return base64Value.replace(/\s+/g, "")
}

function normalizeOutgoingMedia(input: OutgoingMediaInput | null | undefined) {
  if (!input) {
    return null
  }

  const mimeType = String(input.mimeType || "").trim().toLowerCase()
  const base64 = typeof input.base64 === "string" ? normalizeBase64Payload(input.base64) : ""

  if (!mimeType && !base64) {
    return null
  }

  if (!mimeType || !base64) {
    throw new Error("بيانات الصورة غير مكتملة.")
  }

  if (!ALLOWED_OUTBOUND_MEDIA_MIME_TYPES.has(mimeType)) {
    throw new Error("نوع الصورة غير مدعوم. الأنواع المسموحة: JPG و PNG و WEBP.")
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
    throw new Error("صيغة الصورة المرفوعة غير صالحة.")
  }

  const mediaSizeBytes = Buffer.from(base64, "base64").length
  if (!Number.isFinite(mediaSizeBytes) || mediaSizeBytes <= 0) {
    throw new Error("تعذر قراءة الصورة المرفوعة.")
  }

  if (mediaSizeBytes > MAX_OUTBOUND_MEDIA_SIZE_BYTES) {
    throw new Error("حجم الصورة كبير جدًا. اختر صورة أصغر ثم أعد المحاولة.")
  }

  return {
    mimeType,
    base64,
    fileName: sanitizeOutgoingMediaFileName(input.fileName),
  } satisfies NormalizedOutgoingMedia
}

async function insertQueueRows(
  supabase: ReturnType<typeof createAdminClient>,
  rows: Array<{
    id: string
    phone_number: string
    message: string
    message_type: string
    media_mime_type: string | null
    media_base64: string | null
    media_file_name: string | null
    status: string
  }>,
  options?: { includesMedia?: boolean },
) {
  if (rows.length === 0) {
    return
  }

  const { error } = await supabase
    .from("whatsapp_queue")
    .insert(rows)

  if (!error) {
    return
  }

  if (isMissingMediaColumnsError(error)) {
    if (options?.includesMedia) {
      throw new Error(`قاعدة البيانات لا تدعم إرسال الصور بعد. شغّل ملف ${OUTBOUND_WHATSAPP_MEDIA_MIGRATION} ثم أعد المحاولة.`)
    }

    const legacyRows = rows.map(stripOutboundMediaColumns)
    const { error: legacyError } = await supabase
      .from("whatsapp_queue")
      .insert(legacyRows)

    if (legacyError) {
      console.error("[WhatsApp Queue] Legacy insert error:", legacyError)
      throw new Error("فشل في إضافة الرسائل إلى طابور واتساب")
    }

    return
  }

  console.error("[WhatsApp Queue] Insert error:", error)
  throw new Error("فشل في إضافة الرسائل إلى طابور واتساب")
}

/**
 * Queue-based WhatsApp Send Endpoint
 * POST /api/whatsapp/send
 * يضيف الرسالة إلى طابور الإرسال ليعالجها الـ Worker الخارجي
 */
export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json()
    const { phoneNumber, message, recipients } = body
    const normalizedMessage = typeof message === "string" ? message.trim() : ""
    const sharedMedia = normalizeOutgoingMedia(body?.media)
    const workerStatus = await readWhatsAppWorkerStatus()

    if (!isWhatsAppWorkerReady(workerStatus)) {
      return NextResponse.json(
        { error: "واتساب غير مرتبط حاليًا. اربط واتساب أولًا ثم أعد الإرسال." },
        { status: 409 }
      )
    }

    if (!normalizedMessage && !sharedMedia && !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: "يجب إدخال نص أو إرفاق صورة على الأقل" },
        { status: 400 }
      )
    }

    if (Array.isArray(recipients)) {
      const hasAnyMessage = recipients.some(
        (recipient) => typeof recipient?.message === "string" && recipient.message.trim(),
      )
      const hasAnyMedia = sharedMedia || recipients.some((recipient) => Boolean(recipient?.media))

      if (!normalizedMessage && !hasAnyMessage && !hasAnyMedia) {
        return NextResponse.json(
          { error: "يجب إدخال نص أو إرفاق صورة على الأقل" },
          { status: 400 }
        )
      }

      const bulkResult = await enqueueMessagesBulk({
        message: normalizedMessage,
        recipients,
        sentByUserId: auth.session.id,
        media: sharedMedia,
      })

      return NextResponse.json({
        success: true,
        queuedCount: bulkResult.queuedCount,
        failedCount: bulkResult.failedCount,
        invalidPhoneCount: bulkResult.invalidPhoneCount,
        missingPhoneCount: bulkResult.missingPhoneCount,
        message: `تمت إضافة ${bulkResult.queuedCount} رسالة إلى طابور الإرسال`,
      })
    }

    // التحقق من البيانات المطلوبة
    if (!phoneNumber || (!normalizedMessage && !sharedMedia)) {
      return NextResponse.json(
        { error: "رقم الهاتف مع نص أو صورة مطلوبان" },
        { status: 400 }
      )
    }

    const queuedMessage = await enqueueMessage({
      id: crypto.randomUUID(),
      phoneNumber: normalizeWhatsAppPhoneNumber(phoneNumber),
      message: normalizedMessage,
      userId: auth.session.id,
      media: sharedMedia,
    })

    return NextResponse.json({
      success: true,
      queuedMessage,
      message: "تمت إضافة الرسالة إلى طابور الإرسال بنجاح",
    })
  } catch (error) {
    console.error("[WhatsApp] Send error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "حدث خطأ أثناء إضافة الرسالة إلى الطابور",
      },
      { status: 500 }
    )
  }
}

/**
 * إضافة الرسالة إلى الطابور مع إنشاء سجل تاريخي متزامن معها
 */
async function enqueueMessage(data: QueueMessageInput) {
  const supabase = createAdminClient()
  const messageType = data.media ? "image" : "text"

  await insertQueueRows(supabase, [{
      id: data.id,
      phone_number: data.phoneNumber,
      message: data.message,
      message_type: messageType,
      media_mime_type: data.media?.mimeType || null,
      media_base64: data.media?.base64 || null,
      media_file_name: data.media?.fileName || null,
      status: "pending",
    }], { includesMedia: Boolean(data.media) })

  const { data: queuedMessage, error: queueSelectError } = await supabase
    .from("whatsapp_queue")
    .select()
    .eq("id", data.id)
    .single()

  if (queueSelectError) {
    console.error("[WhatsApp Queue] Error fetching enqueued message:", queueSelectError)
    throw new Error("فشل في إضافة الرسالة إلى طابور واتساب")
  }

  try {
    await insertWhatsAppHistoryRows(supabase, [{
      id: data.id,
      phone_number: data.phoneNumber,
      message_text: data.message,
      message_type: messageType,
      media_mime_type: data.media?.mimeType || null,
      media_base64: data.media?.base64 || null,
      media_file_name: data.media?.fileName || null,
      status: "pending",
      sent_by: data.userId || null,
      sent_at: null,
    }], { includesMedia: Boolean(data.media) })
  } catch (historyError) {
    console.error("[WhatsApp History] Error saving message history:", historyError)
  }

  return queuedMessage
}

async function enqueueMessagesBulk(params: {
  message: string
  recipients: BulkQueueRecipientInput[]
  sentByUserId: string
  media?: NormalizedOutgoingMedia | null
}) {
  const supabase = createAdminClient()
  const queueRows: Array<{
    id: string
    phone_number: string
    message: string
    message_type: string
    media_mime_type: string | null
    media_base64: string | null
    media_file_name: string | null
    status: string
  }> = []
  const historyRows: Array<{
    id: string
    phone_number: string
    message_text: string
    message_type: string
    media_mime_type: string | null
    media_base64: string | null
    media_file_name: string | null
    status: string
    sent_by: string | null
    sent_at: null
  }> = []
  let invalidPhoneCount = 0
  let missingPhoneCount = 0

  for (const recipient of params.recipients) {
    if (!recipient?.phoneNumber || !String(recipient.phoneNumber).trim()) {
      missingPhoneCount += 1
      continue
    }

    const resolvedMedia = normalizeOutgoingMedia(recipient.media) || params.media || null
    const resolvedMessage = typeof recipient.message === "string" && recipient.message.trim()
      ? recipient.message.trim()
      : params.message

    if (!resolvedMessage && !resolvedMedia) {
      continue
    }

    let normalizedPhone
    try {
      normalizedPhone = normalizeWhatsAppPhoneNumber(String(recipient.phoneNumber))
    } catch {
      invalidPhoneCount += 1
      continue
    }

    const id = crypto.randomUUID()
    const messageType = resolvedMedia ? "image" : "text"
    queueRows.push({
      id,
      phone_number: normalizedPhone,
      message: resolvedMessage,
      message_type: messageType,
      media_mime_type: resolvedMedia?.mimeType || null,
      media_base64: resolvedMedia?.base64 || null,
      media_file_name: resolvedMedia?.fileName || null,
      status: "pending",
    })
    historyRows.push({
      id,
      phone_number: normalizedPhone,
      message_text: resolvedMessage,
      message_type: messageType,
      media_mime_type: resolvedMedia?.mimeType || null,
      media_base64: resolvedMedia?.base64 || null,
      media_file_name: resolvedMedia?.fileName || null,
      status: "pending",
      sent_by: params.sentByUserId,
      sent_at: null,
    })
  }

  if (queueRows.length > 0) {
    await insertQueueRows(supabase, queueRows, { includesMedia: queueRows.some((row) => row.message_type === "image") })

    try {
      await insertWhatsAppHistoryRows(supabase, historyRows, { includesMedia: historyRows.some((row) => row.message_type === "image") })
    } catch (historyError) {
      console.error("[WhatsApp History] Error bulk saving message history:", historyError)
    }
  }

  return {
    queuedCount: queueRows.length,
    failedCount: invalidPhoneCount + missingPhoneCount,
    invalidPhoneCount,
    missingPhoneCount,
  }
}

/**
 * GET /api/whatsapp/send
 * الحصول على قائمة الرسائل المرسلة
 */
export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }
    const supabase = createAdminClient()

    const { data: messages, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("[Database] Error fetching messages:", error)
      return NextResponse.json(
        { error: "فشل في جلب الرسائل" },
        { status: 500 }
      )
    }

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("[WhatsApp] Get messages error:", error)
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الرسائل" },
      { status: 500 }
    )
  }
}
