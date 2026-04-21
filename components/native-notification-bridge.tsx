"use client"

import { useEffect } from "react"
import { isWebPushPermissionDeniedError, syncWebPushSubscription } from "@/lib/push-subscription-client"

function isSupported() {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator
}

export function NativeNotificationBridge() {
  useEffect(() => {
    if (!isSupported()) {
      return
    }

    let disposed = false

    const ensureWebPushSubscription = async () => {
      const isLoggedIn = localStorage.getItem("isLoggedIn") === "true"
      const accountNumber = localStorage.getItem("account_number") || localStorage.getItem("accountNumber")

      if (!isLoggedIn || !accountNumber || Notification.permission !== "granted") {
        return
      }

      try {
        await syncWebPushSubscription()
      } catch (error) {
        if (isWebPushPermissionDeniedError(error)) {
          return
        }

        console.error("[notifications] failed to sync web push subscription", error)
      }
    }

    void ensureWebPushSubscription()

    const focusHandler = () => {
      void ensureWebPushSubscription()
    }

    window.addEventListener("focus", focusHandler)

    return () => {
      disposed = true
      window.removeEventListener("focus", focusHandler)
    }
  }, [])

  return null
}