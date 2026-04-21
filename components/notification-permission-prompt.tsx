"use client"

import { useEffect, useMemo, useState } from "react"
import { BellRing } from "lucide-react"
import {
  getLastWebPushSubscriptionError,
  syncWebPushSubscription,
} from "@/lib/push-subscription-client"

const NOTIFICATION_PERMISSION_UPDATED_EVENT = "app-notification-permission-updated"
const SERVICE_WORKER_READY_EVENT = "app-service-worker-ready"

const ENABLED_AT_KEY = "nativeNotificationsEnabledAt"
const NOTIFIED_IDS_KEY = "nativeNotificationsShownIds"
const DISMISSED_AT_KEY = "nativeNotificationsPromptDismissedAt"
const DISMISS_DURATION_MS = 2 * 24 * 60 * 60 * 1000

function getAccountScopedKey(baseKey: string, accountNumber?: string | null) {
  const normalizedAccountNumber = String(accountNumber || "").trim()
  return normalizedAccountNumber ? `${baseKey}_${normalizedAccountNumber}` : baseKey
}

function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator
}

function isStandaloneApp() {
  if (typeof window === "undefined") {
    return false
  }

  return window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
}

export function NotificationPermissionPrompt() {
  const [isReady, setIsReady] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [accountNumber, setAccountNumber] = useState<string | null>(null)
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const updatePromptState = () => {
      const supported = isNotificationSupported()
      const currentAccountNumber = localStorage.getItem("account_number") || localStorage.getItem("accountNumber")
      const dismissedAt = Number(localStorage.getItem(getAccountScopedKey(DISMISSED_AT_KEY, currentAccountNumber)) || 0)
      const enabledAt = localStorage.getItem(getAccountScopedKey(ENABLED_AT_KEY, currentAccountNumber))

      setAccountNumber(currentAccountNumber)
      setIsStandalone(isStandaloneApp())
      setIsLoggedIn(localStorage.getItem("isLoggedIn") === "true")
      setPermission(supported ? Notification.permission : "unsupported")
      setIsDismissed(Boolean(enabledAt) || (dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_DURATION_MS))
      setStatusMessage(getLastWebPushSubscriptionError())
      setIsReady(true)
    }

    const updateServiceWorkerReadyState = async () => {
      if (!("serviceWorker" in navigator)) {
        setIsServiceWorkerReady(false)
        return
      }

      try {
        const existingRegistration = await navigator.serviceWorker.getRegistration("/sw.js")
        if (existingRegistration) {
          await navigator.serviceWorker.ready
          setIsServiceWorkerReady(true)
          return
        }
      } catch {}

      setIsServiceWorkerReady(false)
    }

    updatePromptState()
    void updateServiceWorkerReadyState()

    const standaloneMedia = window.matchMedia("(display-mode: standalone)")
    const updateStandaloneState = () => updatePromptState()
    const handleServiceWorkerReady = () => setIsServiceWorkerReady(true)

    standaloneMedia.addEventListener("change", updateStandaloneState)
    window.addEventListener("focus", updateStandaloneState)
    window.addEventListener("storage", updateStandaloneState)
    window.addEventListener("app-login", updateStandaloneState)
    window.addEventListener(SERVICE_WORKER_READY_EVENT, handleServiceWorkerReady)

    return () => {
      standaloneMedia.removeEventListener("change", updateStandaloneState)
      window.removeEventListener("focus", updateStandaloneState)
      window.removeEventListener("storage", updateStandaloneState)
      window.removeEventListener("app-login", updateStandaloneState)
      window.removeEventListener(SERVICE_WORKER_READY_EVENT, handleServiceWorkerReady)
    }
  }, [])

  const shouldShow = useMemo(() => {
    return isReady && isServiceWorkerReady && isStandalone && isLoggedIn && permission !== "granted" && permission !== "unsupported" && !isDismissed
  }, [isDismissed, isLoggedIn, isReady, isServiceWorkerReady, isStandalone, permission])

  const handleEnableNotifications = async () => {
    if (!isNotificationSupported()) {
      setPermission("unsupported")
      setStatusMessage("هذا الجهاز أو المتصفح لا يدعم إشعارات الجوال")
      return
    }

    if (!isServiceWorkerReady) {
      setStatusMessage("انتظر لحظة حتى يجهز التطبيق الإشعارات ثم جرّب مرة أخرى.")
      return
    }

    if (Notification.permission === "denied") {
      setPermission("denied")
      setStatusMessage("الإشعارات مرفوضة من إعدادات الجهاز أو المتصفح. فعّلها يدويًا ثم ارجع للتطبيق.")
      return
    }

    setIsSubmitting(true)
    try {
      const nextPermission = await Notification.requestPermission()
      setPermission(nextPermission)
      window.dispatchEvent(new Event(NOTIFICATION_PERMISSION_UPDATED_EVENT))

      if (nextPermission === "granted") {
        await navigator.serviceWorker.ready
        await syncWebPushSubscription()
        localStorage.removeItem(getAccountScopedKey(DISMISSED_AT_KEY, accountNumber))
        setStatusMessage(null)
        setIsDismissed(true)
        return
      }

      if (nextPermission === "denied") {
        setStatusMessage("تم رفض الإشعارات. إذا أردتها لاحقًا فعّلها من إعدادات الجهاز أو المتصفح.")
        return
      }

      setStatusMessage("لم يظهر طلب النظام أو لم يكتمل. جرّب مرة أخرى وتأكد أن التطبيق مثبت على الجوال.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تفعيل إشعارات الجوال الآن"
      setStatusMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem(getAccountScopedKey(DISMISSED_AT_KEY, accountNumber), String(Date.now()))
    setIsDismissed(true)
  }

  if (!shouldShow) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(15,23,42,0.46)] px-4" dir="rtl">
      <div className="w-full max-w-sm rounded-[28px] border border-[#d8e4fb] bg-white px-6 py-7 text-center shadow-[0_28px_80px_rgba(15,23,42,0.22)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#20335f_0%,#3453a7_62%,#7d9ff5_100%)] text-white">
          <BellRing className="h-7 w-7" />
        </div>

        <p className="mb-6 text-lg font-black leading-8 text-[#1a2332]">هل تريد تفعيل الإشعارات؟</p>

        {permission === "denied" || statusMessage ? (
          <p className="mb-4 rounded-2xl border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm font-semibold leading-7 text-[#9a3412]">
            {statusMessage || "الإشعارات مرفوضة من إعدادات الجهاز أو المتصفح. فعّلها يدويًا ثم ارجع للتطبيق."}
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={permission === "denied" ? handleDismiss : handleEnableNotifications}
            disabled={isSubmitting}
            className="rounded-full bg-[#3453a7] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#28448e] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "جاري التفعيل..." : permission === "denied" ? "فهمت" : "نعم"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-full border border-[#d8e4fb] px-4 py-3 text-sm font-bold text-[#526071] transition hover:bg-[#f8fbff]"
          >
            لاحقًا
          </button>
        </div>
      </div>
    </div>
  )
}