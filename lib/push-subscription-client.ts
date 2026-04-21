const ENABLED_AT_KEY = "nativeNotificationsEnabledAt"
const DISMISSED_AT_KEY = "nativeNotificationsPromptDismissedAt"
const NOTIFIED_IDS_KEY = "nativeNotificationsShownIds"
const LAST_ERROR_KEY = "lastWebPushSubscriptionError"

function getAccountScopedKey(baseKey: string, accountNumber?: string | null) {
  const normalizedAccountNumber = String(accountNumber || "").trim()
  return normalizedAccountNumber ? `${baseKey}_${normalizedAccountNumber}` : baseKey
}

function clearStoredError() {
  try {
    localStorage.removeItem(LAST_ERROR_KEY)
  } catch {}
}

function storeDiagnosticError(message: string) {
  try {
    localStorage.setItem(LAST_ERROR_KEY, message)
  } catch {}
}

export function isWebPushPermissionDeniedError(error: unknown) {
  const name = String((error as { name?: string } | null)?.name || "").toLowerCase()
  const message = String((error as { message?: string } | null)?.message || error || "").toLowerCase()

  return name === "notallowederror"
    || message.includes("permission denied")
    || message.includes("registration failed - permission denied")
    || message.includes("denied permission")
}

export function isWebPushServiceUnavailableError(error: unknown) {
  const name = String((error as { name?: string } | null)?.name || "").toLowerCase()
  const message = String((error as { message?: string } | null)?.message || error || "").toLowerCase()

  return name === "aborterror"
    || message.includes("push service not available")
    || message.includes("push service unavailable")
    || message.includes("registration failed")
}

export function isWebPushInvalidApplicationServerKeyError(error: unknown) {
  const name = String((error as { name?: string } | null)?.name || "").toLowerCase()
  const message = String((error as { message?: string } | null)?.message || error || "").toLowerCase()

  return name === "invalidaccesserror"
    || message.includes("applicationserverkey is not valid")
    || message.includes("application server key is not valid")
    || message.includes("provided applicationserverkey is not valid")
}

export type WebPushSyncResult = {
  configured: boolean
  subscribed: boolean
  permissionDenied?: boolean
  pushServiceUnavailable?: boolean
}

async function getResponseErrorMessage(response: Response, fallbackMessage: string) {
  try {
    const contentType = response.headers.get("content-type") || ""
    if (contentType.includes("application/json")) {
      const data = await response.json()
      const message = String(data?.error || data?.message || "").trim()
      if (message) {
        return message
      }
    } else {
      const text = (await response.text()).trim()
      if (text) {
        return text
      }
    }
  } catch {}

  return fallbackMessage
}

export function getLastWebPushSubscriptionError() {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return localStorage.getItem(LAST_ERROR_KEY)
  } catch {
    return null
  }
}

export function clearNotificationLocalState(accountNumber?: string | null) {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.removeItem(getAccountScopedKey(ENABLED_AT_KEY, accountNumber))
    localStorage.removeItem(getAccountScopedKey(DISMISSED_AT_KEY, accountNumber))
    localStorage.removeItem(NOTIFIED_IDS_KEY)
    clearStoredError()
  } catch {}
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const normalized = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(normalized)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export async function syncWebPushSubscription(): Promise<WebPushSyncResult> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { configured: false, subscribed: false }
  }

  const accountNumber = localStorage.getItem("account_number") || localStorage.getItem("accountNumber")
  const enabledAtKey = getAccountScopedKey(ENABLED_AT_KEY, accountNumber)

  const configResponse = await fetch("/api/push-subscriptions", { method: "GET", cache: "no-store" })
  if (!configResponse.ok) {
    const message = await getResponseErrorMessage(configResponse, "تعذر تحميل إعدادات Web Push")
    storeDiagnosticError(message)
    throw new Error(message)
  }

  const config = await configResponse.json()
  if (!config.configured || !config.publicKey) {
    storeDiagnosticError("الخادم غير مهيأ حاليًا لإشعارات Web Push الخارجية")
    localStorage.setItem(enabledAtKey, new Date().toISOString())
    localStorage.removeItem(NOTIFIED_IDS_KEY)
    return { configured: false, subscribed: false }
  }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(String(config.publicKey)),
      })
    } catch (error) {
      if (isWebPushInvalidApplicationServerKeyError(error)) {
        storeDiagnosticError("مفتاح Web Push العام غير صالح أو لم يتم ضبطه بشكل صحيح على الخادم")
        localStorage.setItem(enabledAtKey, new Date().toISOString())
        localStorage.removeItem(NOTIFIED_IDS_KEY)
        return { configured: false, subscribed: false }
      }

      if (isWebPushPermissionDeniedError(error)) {
        storeDiagnosticError("تم رفض إذن الإشعارات من إعدادات الجهاز أو المتصفح")
        return { configured: true, subscribed: false, permissionDenied: true }
      }

      if (isWebPushServiceUnavailableError(error)) {
        storeDiagnosticError("خدمة الإشعارات غير متاحة حاليًا على هذا الجهاز أو المتصفح")
        return { configured: true, subscribed: false, pushServiceUnavailable: true }
      }

      const normalizedError = error instanceof Error ? error : new Error("تعذر إنشاء اشتراك المتصفح للإشعارات")
      const message = normalizedError.message || "تعذر إنشاء اشتراك المتصفح للإشعارات"
      storeDiagnosticError(message)
      throw normalizedError
    }
  }

  const saveResponse = await fetch("/api/push-subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    }),
  })

  if (!saveResponse.ok) {
    const message = await getResponseErrorMessage(saveResponse, "تعذر حفظ اشتراك الجهاز للإشعارات")
    storeDiagnosticError(message)
    throw new Error(message)
  }

  localStorage.setItem(enabledAtKey, new Date().toISOString())
  localStorage.removeItem(NOTIFIED_IDS_KEY)
  clearStoredError()

  return { configured: true, subscribed: true }
}

export async function unregisterWebPushSubscription(options?: {
  accountNumber?: string | null
  clearLocalState?: boolean
  unsubscribeLocal?: boolean
}) {
  const accountNumber = options?.accountNumber
  const shouldClearLocalState = options?.clearLocalState !== false
  const shouldUnsubscribeLocal = options?.unsubscribeLocal !== false

  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    if (shouldClearLocalState) {
      clearNotificationLocalState(accountNumber)
    }
    return { removed: false, unsubscribed: false }
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription?.endpoint) {
    const deleteResponse = await fetch("/api/push-subscriptions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        forceCurrentDevice: true,
      }),
    })

    if (!deleteResponse.ok) {
      const message = await getResponseErrorMessage(deleteResponse, "تعذر حذف اشتراك الجهاز من الخادم")
      storeDiagnosticError(message)
      throw new Error(message)
    }
  }

  if (subscription && shouldUnsubscribeLocal) {
    try {
      await subscription.unsubscribe()
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر إلغاء اشتراك المتصفح محليًا"
      storeDiagnosticError(message)
      throw new Error(message)
    }
  }

  if (shouldClearLocalState) {
    clearNotificationLocalState(accountNumber)
  } else {
    clearStoredError()
  }

  return {
    removed: Boolean(subscription?.endpoint),
    unsubscribed: Boolean(subscription && shouldUnsubscribeLocal),
  }
}