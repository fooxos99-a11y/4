"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteLoader } from "@/components/ui/site-loader"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useAlertDialog, useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { AlertTriangle, CheckCircle2, LogOut, QrCode, RefreshCw, Smartphone } from "lucide-react"

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
  if (status.ready && status.authenticated && status.status === "connected") {
    return 4000
  }

  if (imageFailed) {
    return 1200
  }

  if (status.qrAvailable && status.status === "waiting_for_qr") {
    return 0
  }

  switch (status.status) {
    case "authenticating":
    case "disconnecting":
    case "fetching_qr":
    case "starting":
      return 1200
    case "waiting_for_qr":
      return 0
    default:
      return status.workerOnline ? 5000 : 0
  }
}

function getStatusUi(status: WhatsAppStatusResponse) {
  if (status.ready && status.authenticated && status.status === "connected") {
    return {
      label: "تم الربط",
      tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
      description: "الواتساب متصل وجاهز للإرسال.",
    }
  }

  if (!status.workerOnline) {
    return {
      label: "عامل واتساب غير متصل",
      tone: "bg-rose-50 text-rose-700 border-rose-200",
      description: "العامل المسؤول عن واتساب غير متصل حالياً، لذلك لن يظهر باركود جديد حتى يعود للعمل.",
    }
  }

  switch (status.status) {
    case "waiting_for_qr":
      return {
        label: "لم يتم الربط",
        tone: "bg-amber-50 text-amber-700 border-amber-200",
        description: "امسح الباركود من تطبيق واتساب لإكمال الربط.",
      }
    case "authenticating":
      return {
        label: "جاري التحقق",
        tone: "bg-sky-50 text-sky-700 border-sky-200",
        description: "تمت قراءة الباركود. يرجى عدم الخروج من نافذة الأجهزة المرتبطة في واتساب حتى يكتمل الربط.",
      }
    case "auth_failed":
      return {
        label: "فشل الربط",
        tone: "bg-rose-50 text-rose-700 border-rose-200",
        description: "فشل التحقق من الجلسة، وقد تحتاج إلى مسح باركود جديد.",
      }
    case "disconnected":
      return {
        label: "انقطع الاتصال",
        tone: "bg-orange-50 text-orange-700 border-orange-200",
        description: "الجلسة انقطعت. انتظر باركودًا جديدًا أو أعد الربط.",
      }
    case "starting":
      if (!status.authenticated && !status.qrAvailable) {
        return {
          label: "لم يتم الربط",
          tone: "bg-slate-100 text-slate-700 border-slate-200",
          description: "يتم تجهيز الجلسة الآن، وسيظهر الباركود عند جاهزيته. إذا استمرت هذه الحالة فحدّث الباركود.",
        }
      }

      return {
        label: "جاري التشغيل",
        tone: "bg-slate-100 text-slate-700 border-slate-200",
        description: "عامل واتساب بدأ التشغيل ويجهز الجلسة.",
      }
    case "disconnecting":
      return {
        label: "جاري جلب الباركود",
        tone: "bg-slate-100 text-slate-700 border-slate-200",
        description: "يتم إنهاء الجلسة الحالية وتجهيز باركود جديد.",
      }
    case "fetching_qr":
      return {
        label: "جاري جلب الباركود",
        tone: "bg-slate-100 text-slate-700 border-slate-200",
        description: "يتم إنهاء الجلسة الحالية وتجهيز باركود جديد.",
      }
    default:
      return {
        label: "لم يتم الربط",
        tone: "bg-slate-100 text-slate-700 border-slate-200",
        description: "لم تظهر جلسة واتساب جاهزة حتى الآن.",
      }
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "-"

  try {
    return new Intl.DateTimeFormat("ar-SA", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function WhatsAppQrPage() {
  const router = useRouter()
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("باركود الواتساب")
  const confirmDialog = useConfirmDialog()
  const alertDialog = useAlertDialog()
  const [status, setStatus] = useState<WhatsAppStatusResponse>(DEFAULT_STATUS)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [imageFailed, setImageFailed] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isRefreshingQr, setIsRefreshingQr] = useState(false)
  const statusUi = getStatusUi(status)
  const isConnected = status.ready && status.authenticated && status.status === "connected"
  const canDisconnect = status.ready && status.authenticated && status.status === "connected" && !isDisconnecting
  const autoRefreshIntervalMs = getAutoRefreshIntervalMs(status, imageFailed)
  const qrImageSrc = status.qrImageUrl

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
    } catch (error) {
      console.error("[whatsapp-qr] fetch status:", error)
    } finally {
      if (!silent) {
        setIsLoadingStatus(false)
      }
    }
  }

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
      return
    }

    void fetchStatus()
  }, [router])

  useEffect(() => {
    if (autoRefreshIntervalMs <= 0) {
      return
    }

    const intervalId = window.setInterval(() => {
      void fetchStatus({ silent: true })
    }, autoRefreshIntervalMs)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [autoRefreshIntervalMs])

  useEffect(() => {
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
  }, [])

  const handleRefreshQr = async () => {
    try {
      setIsRefreshingQr(true)

      const response = await fetch("/api/whatsapp/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        headers: {
          "Content-Type": "application/json",
        },
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

      await alertDialog("تم إرسال طلب إلغاء الربط. سيظهر باركود جديد بعد لحظات لربط جوال آخر.", "تم")
      await fetchStatus()
    } catch (error) {
      await alertDialog(error instanceof Error ? error.message : "تعذر إلغاء الربط حالياً", "خطأ")
    } finally {
      setIsDisconnecting(false)
    }
  }

  if (authLoading || !authVerified || isLoadingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="md" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f8fc]">
      <Header />

      <main className="flex-1 px-3 py-6 md:px-6 md:py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-3 rounded-[32px] border border-[#d8e0f0] bg-white px-5 py-6 shadow-[0_18px_70px_rgba(40,64,130,0.08)] md:flex-row md:items-center md:justify-between md:px-8">
            <div className="text-right">
              <h1 className="flex items-center justify-end gap-3 text-2xl font-black text-[#1a2332] md:text-3xl">
                <span className="inline-flex items-center gap-2 text-[#3453a7]">
                  <QrCode className="h-7 w-7" />
                  <span>:</span>
                </span>
                <span>باركود الواتس اب</span>
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {!status.ready ? (
                <Button
                  type="button"
                  onClick={handleRefreshQr}
                  disabled={isLoadingStatus || isRefreshingQr}
                  variant="outline"
                  className="h-11 rounded-2xl border-[#d7e3f2] bg-white px-5 text-sm font-black text-[#3453a7] hover:bg-[#f8fbff] disabled:opacity-60"
                >
                  <RefreshCw className={`me-2 h-4 w-4 ${isLoadingStatus || isRefreshingQr ? "animate-spin" : ""}`} />
                  {isRefreshingQr ? "جاري تحديث الباركود..." : "تحديث الباركود"}
                </Button>
              ) : null}
              {canDisconnect ? (
                <Button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  variant="outline"
                  className="h-11 rounded-2xl border-rose-200 bg-rose-50 px-5 text-sm font-black text-rose-700 hover:bg-rose-100 hover:text-rose-800 disabled:opacity-60"
                >
                  <LogOut className="me-2 h-4 w-4" />
                  {isDisconnecting ? "جاري إلغاء الربط..." : "إلغاء الربط"}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[30px] border border-[#d8e0f0] bg-white shadow-[0_18px_70px_rgba(40,64,130,0.08)]">
              <CardContent className="p-5 md:p-8">
                {status.qrAvailable && qrImageSrc && !imageFailed ? (
                  <div className="space-y-4">
                    <div className="mx-auto flex max-w-[430px] items-center justify-center rounded-[28px] border border-dashed border-[#cfdcf2] bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fbff_55%,#eef3ff_100%)] p-5 shadow-inner">
                      <img
                        src={qrImageSrc}
                        alt="باركود واتساب"
                        className="h-auto w-full max-w-[360px] rounded-2xl bg-white p-3 shadow-[0_14px_40px_rgba(20,39,92,0.10)]"
                        onError={() => {
                          setImageFailed(true)
                          void fetchStatus({ silent: true })
                        }}
                      />
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-right text-sm font-bold text-amber-800">
                      افتح واتساب في الجوال ثم الأجهزة المرتبطة، وبعدها امسح هذا الباركود لإكمال الربط.
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 rounded-[28px] border border-dashed border-[#d5dfef] bg-[linear-gradient(180deg,#fbfcff_0%,#f2f6ff_100%)] px-6 py-10 text-center">
                    {status.ready ? <CheckCircle2 className="h-16 w-16 text-emerald-500" /> : <Smartphone className="h-16 w-16 text-[#3453a7]" />}
                    <div className="space-y-2">
                      <p className="text-xl font-black text-[#1a2332]">{isConnected ? "تم الربط بنجاح" : statusUi.label}</p>
                      <p className="text-sm font-bold text-[#64748b]">{statusUi.description}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-[30px] border border-[#d8e0f0] bg-white shadow-[0_18px_70px_rgba(40,64,130,0.08)]">
                <CardHeader className="text-right">
                  <CardTitle className="text-lg font-black text-[#1a2332]">تنبيهات مهمة</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-right text-sm font-medium leading-7 text-slate-600">
                  <div className="flex items-start gap-3 rounded-2xl border border-[#e5edf8] bg-[#f8fbff] px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#3453a7]" />
                    <p>إذا ظهرت حالة "لم يتم الربط" فامسح الباركود من واتساب داخل الأجهزة المرتبطة.</p>
                  </div>
                  <div className="flex items-start gap-3 rounded-2xl border border-[#e5edf8] bg-[#f8fbff] px-4 py-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#3453a7]" />
                    <p>إبقاء الهاتف متصلًا بالإنترنت يقلل احتمالات انقطاع الجلسة وفقدان الربط.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
