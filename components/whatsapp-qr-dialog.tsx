"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, LogOut, QrCode, RefreshCw, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { SiteLoader } from "@/components/ui/site-loader"
import { useAlertDialog, useConfirmDialog } from "@/hooks/use-confirm-dialog"

type WhatsAppStatusResponse = {
  status: string
  qrAvailable: boolean
  ready: boolean
  authenticated: boolean
  lastUpdatedAt: string | null
  lastHeartbeatAt: string | null
  qrUpdatedAt: string | null
  connectedAt: string | null
  disconnectedAt: string | null
  authFailedAt: string | null
  lastError: string | null
  workerOnline: boolean
  qrImageUrl: string | null
}

type WhatsAppQrDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialStatus?: Partial<WhatsAppStatusResponse> | null
}

const DEFAULT_STATUS: WhatsAppStatusResponse = {
  status: "not_started",
  qrAvailable: false,
  ready: false,
  authenticated: false,
  lastUpdatedAt: null,
  lastHeartbeatAt: null,
  qrUpdatedAt: null,
  connectedAt: null,
  disconnectedAt: null,
  authFailedAt: null,
  lastError: null,
  workerOnline: false,
  qrImageUrl: null,
}

function getAutoRefreshIntervalMs(status: WhatsAppStatusResponse, imageFailed: boolean) {
  if (status.workerOnline && status.ready && status.authenticated && status.status === "connected") {
    return 4000
  }

  if (imageFailed) {
    return 1200
  }

  if (status.qrAvailable) {
    return 1200
  }

  switch (status.status) {
    case "authenticating":
    case "disconnecting":
    case "fetching_qr":
    case "starting":
      return 1200
    case "waiting_for_qr":
      return 1500
    default:
      return status.workerOnline ? 5000 : 0
  }
}

function getStatusUi(status: WhatsAppStatusResponse) {
  if (status.workerOnline && status.ready && status.authenticated && status.status === "connected") {
    return {
      label: "تم الربط",
      description: "الواتساب متصل وجاهز للإرسال.",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
    }
  }

  if (!status.workerOnline) {
    return {
      label: "عامل واتساب غير متصل",
      description: "الخادم المسؤول عن واتساب غير متصل حالياً، لذلك لن يظهر باركود جديد حتى يعود للعمل.",
      tone: "bg-rose-50 text-rose-700 border-rose-200",
    }
  }

  switch (status.status) {
    case "waiting_for_qr":
      return {
        label: "الباركود جاهز",
        description: "امسح الباركود من تطبيق واتساب لإكمال الربط.",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
      }
    case "authenticating":
      return {
        label: "جاري التحقق",
        description: "تمت قراءة الباركود. يرجى عدم الخروج من نافذة الأجهزة المرتبطة في واتساب حتى يكتمل الربط.",
        tone: "bg-sky-50 text-sky-700 border-sky-200",
      }
    case "disconnecting":
    case "fetching_qr":
      return {
        label: "جاري جلب الباركود",
        description: "يتم إنهاء الجلسة الحالية وتجهيز باركود جديد.",
        tone: "bg-slate-100 text-slate-700 border-slate-200",
      }
    case "starting":
      if (!status.authenticated && !status.qrAvailable) {
        return {
          label: "بانتظار الباركود",
          description: "يتم تجهيز الجلسة الآن، وسيظهر الباركود عند جاهزيته. إذا استمرت هذه الحالة فحدّث الباركود.",
          tone: "bg-slate-100 text-slate-700 border-slate-200",
        }
      }

      return {
        label: "جاري التشغيل",
        description: "عامل واتساب بدأ التشغيل ويجهز الجلسة.",
        tone: "bg-slate-100 text-slate-700 border-slate-200",
      }
    case "auth_failed":
      return {
        label: "فشل الربط",
        description: "فشل التحقق من الجلسة وقد تحتاج إلى تحديث الباركود أو إعادة الربط.",
        tone: "bg-rose-50 text-rose-700 border-rose-200",
      }
    case "disconnected":
      return {
        label: "انقطع الاتصال",
        description: "انقطعت الجلسة. حدّث الباركود أو أعد الربط.",
        tone: "bg-orange-50 text-orange-700 border-orange-200",
      }
    default:
      return {
        label: "بانتظار الباركود",
        description: "لم يظهر باركود جاهز حتى الآن.",
        tone: "bg-slate-100 text-slate-700 border-slate-200",
      }
  }
}

export function WhatsAppQrDialog({ open, onOpenChange, initialStatus }: WhatsAppQrDialogProps) {
  const confirmDialog = useConfirmDialog()
  const alertDialog = useAlertDialog()
  const [status, setStatus] = useState<WhatsAppStatusResponse>(DEFAULT_STATUS)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isRefreshingQr, setIsRefreshingQr] = useState(false)
  const [qrImageVersion, setQrImageVersion] = useState(0)

  const statusUi = useMemo(() => getStatusUi(status), [status])
  const isConnected = status.workerOnline && status.ready && status.authenticated && status.status === "connected"
  const canDisconnect = isConnected && !isDisconnecting
  const autoRefreshIntervalMs = getAutoRefreshIntervalMs(status, imageFailed)
  const qrImageSrc = status.qrImageUrl
    ? `${status.qrImageUrl}${status.qrImageUrl.includes("?") ? "&" : "?"}v=${qrImageVersion}`
    : null

  const fetchStatus = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) {
        setIsLoadingStatus(true)
      }

      const response = await fetch(`/api/whatsapp/status?t=${Date.now()}`, { cache: "no-store" })
      if (!response.ok) {
        throw new Error("تعذر جلب حالة واتساب")
      }

      const data = (await response.json()) as WhatsAppStatusResponse
      setStatus({ ...DEFAULT_STATUS, ...data })
      setImageFailed(false)
      setQrImageVersion((current) => current + 1)
    } catch (error) {
      console.error("[whatsapp-qr-dialog] fetch status:", error)
    } finally {
      if (!silent) {
        setIsLoadingStatus(false)
      }
    }
  }

  useEffect(() => {
    if (!open) {
      return
    }

    if (initialStatus) {
      setStatus((current) => ({
        ...DEFAULT_STATUS,
        ...current,
        ...initialStatus,
      }))
    }

    void fetchStatus()
  }, [open, initialStatus])

  useEffect(() => {
    if (!open || autoRefreshIntervalMs <= 0) {
      return
    }

    const intervalId = window.setInterval(() => {
      void fetchStatus({ silent: true })
    }, autoRefreshIntervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [open, autoRefreshIntervalMs])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleFocus = () => {
      void fetchStatus({ silent: true })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchStatus({ silent: true })
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [open])

  const handleRefreshQr = async () => {
    try {
      setIsRefreshingQr(true)
      const response = await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "تعذر تحديث الباركود")
      }

      setStatus((current) => ({
        ...current,
        status: "fetching_qr",
        ready: false,
        authenticated: false,
        qrAvailable: false,
        qrImageUrl: null,
      }))
      setImageFailed(false)
      await fetchStatus({ silent: true })
    } catch (error) {
      await alertDialog(error instanceof Error ? error.message : "تعذر تحديث الباركود حالياً", "خطأ")
    } finally {
      setIsRefreshingQr(false)
    }
  }

  const handleDisconnect = async () => {
    const confirmed = await confirmDialog({
      title: "إلغاء ربط واتساب",
      description: "سيتم فصل الجوال الحالي وإنشاء باركود جديد لتتمكن من ربط جوال آخر. هل تريد المتابعة؟",
      confirmText: "إلغاء الربط",
      cancelText: "تراجع",
    })

    if (!confirmed) {
      return
    }

    try {
      setIsDisconnecting(true)
      const response = await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "تعذر إلغاء الربط")
      }

      setStatus((current) => ({
        ...current,
        status: "fetching_qr",
        ready: false,
        authenticated: false,
        qrAvailable: false,
        qrImageUrl: null,
      }))

      await alertDialog("تم إرسال طلب إلغاء الربط. حدّث الباركود بعد لحظات لعرض الكود الجديد.", "تم")
      await fetchStatus()
    } catch (error) {
      await alertDialog(error instanceof Error ? error.message : "تعذر إلغاء الربط حالياً", "خطأ")
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md overflow-hidden rounded-[28px] border-[#d8e0f0] bg-white p-0" showCloseButton={false}>
        <div className="space-y-0" dir="rtl">
          <DialogHeader className="border-b border-[#e6edf8] px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 text-right">
                <DialogTitle className="flex items-center justify-start gap-2 text-right text-xl font-black text-[#1a2332]">
                  <QrCode className="h-5 w-5 text-[#3453a7]" />
                  باركود الواتساب
                </DialogTitle>
                <p className="text-sm font-bold text-[#64748b]">يجب أن يكون الهاتف متصل بالإنترنت أثناء إرسال الرسائل</p>
              </div>

              <div className="flex items-center gap-2">
                {!status.ready ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRefreshQr}
                    disabled={isLoadingStatus || isRefreshingQr}
                    className="h-10 rounded-2xl border-[#d7e3f2] bg-white px-3 text-sm font-black text-[#3453a7] hover:bg-[#f8fbff]"
                  >
                    <RefreshCw className={`me-1.5 h-4 w-4 ${isLoadingStatus || isRefreshingQr ? "animate-spin" : ""}`} />
                    {isRefreshingQr ? "جاري التحديث..." : "تحديث"}
                  </Button>
                ) : null}
                {canDisconnect ? (
                  <Button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    variant="outline"
                    className="h-10 rounded-2xl border-rose-200 bg-rose-50 px-3 text-sm font-black text-rose-700 hover:bg-rose-100 hover:text-rose-700"
                  >
                    <LogOut className="me-1.5 h-4 w-4" />
                    {isDisconnecting ? "جاري الإلغاء..." : "إلغاء الربط"}
                  </Button>
                ) : null}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 p-5">
            {status.qrAvailable && qrImageSrc && !imageFailed ? (
              <div className="flex justify-center rounded-[24px] border border-dashed border-[#cfdcf2] bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fbff_55%,#eef3ff_100%)] p-4">
                <img
                  src={qrImageSrc}
                  alt="باركود واتساب"
                  className="h-auto w-full max-w-[280px] rounded-2xl bg-white p-3 shadow-[0_14px_40px_rgba(20,39,92,0.10)]"
                  onError={() => {
                    setImageFailed(true)
                    void fetchStatus({ silent: true })
                  }}
                />
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-[#d5dfef] bg-[linear-gradient(180deg,#fbfcff_0%,#f2f6ff_100%)] px-5 py-8 text-center">
                {isLoadingStatus ? (
                  <SiteLoader size="md" color="#3453a7" />
                ) : status.ready ? (
                  <CheckCircle2 className="h-14 w-14 text-emerald-500" />
                ) : (
                  <Smartphone className="h-14 w-14 text-[#3453a7]" />
                )}
                <div className="space-y-2">
                  <p className="text-lg font-black text-[#1a2332]">{isConnected ? "تم الربط بنجاح" : statusUi.label}</p>
                  <p className="text-sm font-bold text-[#64748b]">{statusUi.description}</p>
                </div>
              </div>
            )}

            {status.lastError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-right text-sm font-bold text-rose-700">
                آخر ملاحظة من العامل: {status.lastError}
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}