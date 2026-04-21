import { createClient as createSupabaseClient } from "@supabase/supabase-js"

type PushSubscriptionJson = {
  endpoint: string
  expirationTime?: number | null
  keys?: {
    p256dh?: string
    auth?: string
  }
}

type AppNotificationInsert = {
  user_account_number: string
  message: string
}

type AppPushNotification = AppNotificationInsert & {
  title?: string | null
  url?: string | null
  tag?: string | null
}

type WebPushModule = {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void
  sendNotification: (subscription: PushSubscriptionJson, payload: string) => Promise<void>
}

type ConfiguredWebPushResult = {
  webPush: WebPushModule | null
  reason: string | null
}

function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role environment variables are not set")
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function loadWebPushModule(): Promise<WebPushModule | null> {
  try {
    const importedModule = await import("web-push")
    const candidate = ((importedModule as unknown as { default?: WebPushModule }).default || importedModule) as WebPushModule

    if (typeof candidate?.sendNotification === "function" && typeof candidate?.setVapidDetails === "function") {
      return candidate
    }

    return null
  } catch (error) {
    console.error("[push] failed to load web-push module", error)
    return null
  }
}

function normalizeWebPushSubject(subject: string | undefined) {
  const value = String(subject || "").trim()
  if (!value) {
    return "mailto:notifications@example.com"
  }

  if (value.startsWith("mailto:")) {
    const email = value.slice("mailto:".length).trim()
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.endsWith("@local.invalid") && !email.endsWith(".local.invalid")) {
      return `mailto:${email}`
    }

    return "mailto:notifications@example.com"
  }

  if (/^https:\/\/.+/i.test(value)) {
    return value
  }

  return "mailto:notifications@example.com"
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4)
  return Buffer.from(`${normalized}${padding}`, "base64")
}

function isPlaceholderValue(value: string) {
  const normalized = value.trim().toLowerCase()
  return !normalized || normalized.startsWith("fill_") || normalized.startsWith("your_")
}

function isValidVapidPublicKey(value: string) {
  const normalized = value.trim()
  if (isPlaceholderValue(normalized) || !/^[A-Za-z0-9_-]+$/.test(normalized)) {
    return false
  }

  try {
    return decodeBase64Url(normalized).length === 65
  } catch {
    return false
  }
}

function isValidVapidPrivateKey(value: string) {
  const normalized = value.trim()
  if (isPlaceholderValue(normalized) || !/^[A-Za-z0-9_-]+$/.test(normalized)) {
    return false
  }

  try {
    return decodeBase64Url(normalized).length === 32
  } catch {
    return false
  }
}

function getWebPushConfig() {
  const publicKey = String(process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY || process.env.WEB_PUSH_PUBLIC_KEY || "").trim()
  const privateKey = String(process.env.WEB_PUSH_PRIVATE_KEY || "").trim()
  const subject = normalizeWebPushSubject(process.env.WEB_PUSH_SUBJECT)
  const hasValidPublicKey = isValidVapidPublicKey(publicKey)
  const hasValidPrivateKey = isValidVapidPrivateKey(privateKey)

  return {
    publicKey: hasValidPublicKey ? publicKey : "",
    privateKey: hasValidPrivateKey ? privateKey : "",
    subject,
    configured: hasValidPublicKey && hasValidPrivateKey,
  }
}

async function getConfiguredWebPushModule(): Promise<ConfiguredWebPushResult> {
  const config = getWebPushConfig()

  if (!config.configured) {
    return {
      webPush: null,
      reason: "Web Push environment variables are not configured",
    }
  }

  const webPush = await loadWebPushModule()
  if (!webPush) {
    return {
      webPush: null,
      reason: "web-push module failed to load in the server runtime",
    }
  }

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
  return {
    webPush,
    reason: null,
  }
}

function buildPushPayload(notification: AppPushNotification) {
  return JSON.stringify({
    title: "إشعار جديد!",
    body: notification.message,
    url: notification.url || "/notifications",
    tag: notification.tag || null,
  })
}

export function getWebPushPublicKey() {
  return getWebPushConfig().publicKey
}

export function isWebPushConfigured() {
  return Boolean(getWebPushConfig().configured)
}

export async function savePushSubscription(params: {
  accountNumber: string
  subscription: PushSubscriptionJson
  userAgent?: string | null
}) {
  const supabase = createAdminClient()
  const endpoint = String(params.subscription?.endpoint || "").trim()

  if (!params.accountNumber || !endpoint) {
    throw new Error("Push subscription payload is invalid")
  }

  const payload = {
    user_account_number: params.accountNumber,
    endpoint,
    subscription: params.subscription,
    user_agent: params.userAgent || null,
    disabled_at: null,
    failure_reason: null,
    updated_at: new Date().toISOString(),
    last_used_at: new Date().toISOString(),
  }

  const { error } = await supabase.from("web_push_subscriptions").upsert(payload, { onConflict: "endpoint" })
  if (error) {
    throw error
  }
}

export async function removePushSubscription(endpoint: string, accountNumber?: string) {
  const supabase = createAdminClient()
  let query = supabase.from("web_push_subscriptions").delete().eq("endpoint", endpoint).select("id")

  if (accountNumber) {
    query = query.eq("user_account_number", accountNumber)
  }

  const { data, error } = await query
  if (error) {
    throw error
  }

  return Array.isArray(data) ? data.length : 0
}

async function disablePushSubscription(id: string, reason: string) {
  try {
    const supabase = createAdminClient()
    await supabase
      .from("web_push_subscriptions")
      .update({
        disabled_at: new Date().toISOString(),
        failure_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
  } catch (error) {
    console.error("[push] failed to disable subscription", error)
  }
}

async function markPushSubscriptionFailure(id: string, reason: string) {
  try {
    const supabase = createAdminClient()
    await supabase
      .from("web_push_subscriptions")
      .update({
        failure_reason: reason,
        updated_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      })
      .eq("id", id)
  } catch (error) {
    console.error("[push] failed to update subscription failure reason", error)
  }
}

async function markPushSubscriptionSuccess(id: string) {
  try {
    const supabase = createAdminClient()
    await supabase
      .from("web_push_subscriptions")
      .update({
        last_success_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
        failure_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
  } catch (error) {
    console.error("[push] failed to update subscription success timestamp", error)
  }
}

export async function sendPushNotifications(notifications: AppPushNotification[]) {
  if (notifications.length === 0) {
    return
  }

  const accountNumbers = Array.from(
    new Set(notifications.map((notification) => String(notification.user_account_number || "").trim()).filter(Boolean)),
  )

  if (accountNumbers.length === 0) {
    return
  }

  const supabase = createAdminClient()
  const { data: subscriptions, error } = await supabase
    .from("web_push_subscriptions")
    .select("id, user_account_number, subscription")
    .in("user_account_number", accountNumbers)
    .is("disabled_at", null)

  if (error || !subscriptions?.length) {
    if (error) {
      console.error("[push] failed to load subscriptions", error)
    }
    return
  }

  const { webPush, reason } = await getConfiguredWebPushModule()
  if (!webPush) {
    await Promise.all(
      (subscriptions || []).map((item) => markPushSubscriptionFailure(String(item.id), reason || "Web Push is unavailable")),
    )
    return
  }

  const subscriptionsByAccount = new Map<string, Array<{ id: string; subscription: PushSubscriptionJson }>>()
  for (const item of subscriptions) {
    const accountNumber = String(item.user_account_number || "").trim()
    if (!accountNumber || !item.subscription) {
      continue
    }

    const current = subscriptionsByAccount.get(accountNumber) || []
    current.push({ id: String(item.id), subscription: item.subscription as PushSubscriptionJson })
    subscriptionsByAccount.set(accountNumber, current)
  }

  for (const notification of notifications) {
    const accountSubscriptions = subscriptionsByAccount.get(String(notification.user_account_number || "").trim()) || []
    if (accountSubscriptions.length === 0) {
      continue
    }

    const payload = buildPushPayload(notification)
    for (const item of accountSubscriptions) {
      try {
        await webPush.sendNotification(item.subscription, payload)
        await markPushSubscriptionSuccess(item.id)
      } catch (error) {
        const statusCode = Number((error as { statusCode?: number })?.statusCode || 0)
        const message = error instanceof Error ? error.message : String(error)
        console.error("[push] failed to send notification", error)

        await markPushSubscriptionFailure(item.id, message || `HTTP ${statusCode || "unknown"}`)

        if (statusCode === 404 || statusCode === 410) {
          await disablePushSubscription(item.id, message || `HTTP ${statusCode}`)
        }
      }
    }
  }
}

export async function insertNotificationsAndSendPush(
  supabase: { from: (table: string) => any },
  notifications: AppPushNotification[],
) {
  const rows: AppNotificationInsert[] = notifications
    .map((notification) => ({
      user_account_number: String(notification.user_account_number || "").trim(),
      message: String(notification.message || "").trim(),
    }))
    .filter((notification) => notification.user_account_number && notification.message)

  if (rows.length === 0) {
    return
  }

  const { error } = await supabase.from("notifications").insert(rows)
  if (error) {
    throw error
  }

  await sendPushNotifications(notifications)
}