"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

export type WhatsAppStatusSummary = {
  status?: string
  ready?: boolean
  authenticated?: boolean
  workerOnline?: boolean
  qrAvailable?: boolean
  lastError?: string | null
}

function isLinkedStatus(status: WhatsAppStatusSummary | null) {
  return Boolean(status?.workerOnline && status?.ready && status?.authenticated && status?.status === "connected")
}

export function useWhatsAppStatus(options?: { pollIntervalMs?: number; enabled?: boolean }) {
  const pollIntervalMs = options?.pollIntervalMs ?? 20000
  const enabled = options?.enabled ?? true
  const [status, setStatus] = useState<WhatsAppStatusSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/whatsapp/status?t=${Date.now()}`, { cache: "no-store" })
      if (!response.ok) {
        throw new Error("تعذر جلب حالة واتساب")
      }

      const data = (await response.json()) as WhatsAppStatusSummary
      setStatus(data)
    } catch {
      // Preserve the last known status to avoid false "unlinked" warnings during transient outages.
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()

    if (!enabled || pollIntervalMs <= 0) {
      return
    }

    const intervalId = window.setInterval(() => {
      void refresh()
    }, pollIntervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [enabled, pollIntervalMs, refresh])

  const isReady = useMemo(() => {
    return isLinkedStatus(status)
  }, [status])

  return {
    status,
    isLoading,
    isReady,
    isLinked: isReady,
    refresh,
  }
}