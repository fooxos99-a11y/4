import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeWhatsAppPhoneNumber } from "@/lib/phone-number"
import { isWhatsAppWorkerReady, readWhatsAppWorkerStatus } from "@/lib/whatsapp-worker-status"

type SupabaseLike = {
  from: (table: string) => any
}

async function insertWhatsAppHistory(adminSupabase: ReturnType<typeof createAdminClient>, payload: {
  id: string
  phone_number: string
  message_text: string
  status: string
  sent_by: string | null
  sent_at: null
}) {
  const { error } = await adminSupabase
    .from("whatsapp_messages")
    .insert(payload)

  if (!error) {
    return
  }

  if (error.code === "42P01") {
    return
  }

  if (error.code !== "23503" && error.code !== "22P02") {
    throw error
  }

  const { error: fallbackError } = await adminSupabase
    .from("whatsapp_messages")
    .insert({
      ...payload,
      sent_by: null,
    })

  if (fallbackError && fallbackError.code !== "42P01") {
    throw fallbackError
  }
}

export async function enqueueWhatsAppMessage(supabase: SupabaseLike, params: {
  phoneNumber?: string | null
  message?: string | null
  userId?: string | null
  dedupeDate?: string | null
}) {
  if (!params.phoneNumber || !params.message?.trim()) {
    return { queued: false, reason: "missing-data" as const }
  }

  let normalizedPhone: string
  try {
    normalizedPhone = normalizeWhatsAppPhoneNumber(params.phoneNumber)
  } catch {
    return { queued: false, reason: "invalid-phone" as const }
  }

  const trimmedMessage = params.message.trim()
  const adminSupabase = createAdminClient()
  const workerStatus = await readWhatsAppWorkerStatus()

  if (!isWhatsAppWorkerReady(workerStatus)) {
    return { queued: false, reason: "whatsapp-not-ready" as const }
  }

  if (params.dedupeDate) {
    const { count, error } = await adminSupabase
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("phone_number", normalizedPhone)
      .eq("message_text", trimmedMessage)
      .gte("created_at", `${params.dedupeDate}T00:00:00`)
      .lte("created_at", `${params.dedupeDate}T23:59:59.999`)

    if (error && error.code !== "42P01") {
      throw error
    }

    if ((count || 0) > 0) {
      return { queued: false, reason: "duplicate" as const }
    }
  }

  const id = crypto.randomUUID()
  const { error: queueError } = await adminSupabase
    .from("whatsapp_queue")
    .insert({
      id,
      phone_number: normalizedPhone,
      message: trimmedMessage,
      status: "pending",
    })

  if (queueError) {
    throw queueError
  }

  await insertWhatsAppHistory(adminSupabase, {
    id,
    phone_number: normalizedPhone,
    message_text: trimmedMessage,
    status: "pending",
    sent_by: params.userId || null,
    sent_at: null,
  })

  return { queued: true, id }
}