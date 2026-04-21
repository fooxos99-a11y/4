"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import { Bell, BellRing, CheckCircle2, Clock, Smartphone, Trash2 } from "lucide-react"
import { SiteLoader } from "@/components/ui/site-loader"
import {
  getLastWebPushSubscriptionError,
  syncWebPushSubscription,
} from "@/lib/push-subscription-client"

const NOTIFICATION_PERMISSION_UPDATED_EVENT = "app-notification-permission-updated"

const ENABLED_AT_KEY = "nativeNotificationsEnabledAt"
const NOTIFIED_IDS_KEY = "nativeNotificationsShownIds"

interface Notification {
  id: string
  message: string
  is_read: boolean
  created_at: string
}

export default function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default")
  const [isEnablingNativeNotifications, setIsEnablingNativeNotifications] = useState(false)
  const [isPermissionCardDismissed, setIsPermissionCardDismissed] = useState(false)
  const [subscriptionError, setSubscriptionError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported")
      return
    }

    setNotificationPermission(Notification.permission)
    setSubscriptionError(getLastWebPushSubscriptionError())
  }, [])

  const fetchNotificationStartAt = async (accountNumber: string) => {
    const response = await fetch(`/api/account-created-at?account_number=${accountNumber}`, { cache: "no-store" })
    const data = await response.json()
    return typeof data.created_at === "string" ? data.created_at : null
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const enableNativeNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setNotificationPermission("unsupported")
      return
    }

    setIsEnablingNativeNotifications(true)
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      window.dispatchEvent(new Event(NOTIFICATION_PERMISSION_UPDATED_EVENT))

      if (permission === "granted") {
        await navigator.serviceWorker.ready
        const result = await syncWebPushSubscription()
        setSubscriptionError(result.subscribed ? null : getLastWebPushSubscriptionError())
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر تفعيل إشعارات الجوال على هذا الجهاز"
      setSubscriptionError(message)
    } finally {
      setIsEnablingNativeNotifications(false)
    }
  }

  const fetchNotifications = async () => {
    const accNum = localStorage.getItem("account_number") || localStorage.getItem("accountNumber")
    if (!accNum) {
      setLoading(false)
      return
    }

    try {
      const createdAt = await fetchNotificationStartAt(accNum)
      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_account_number", accNum)
        .order("created_at", { ascending: false })

      if (createdAt) {
        query = query.gte("created_at", createdAt)
      }

      const { data, error } = await query

      if (error) throw error

      setNotifications(data || [])
      
      // Mark as read
      const unreadIds = data?.filter(n => !n.is_read).map(n => n.id) || []
      if (unreadIds.length > 0) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .in("id", unreadIds)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id)
      if (error) throw error

      setNotifications((prev) => prev.filter((notification) => notification.id !== id))
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <SiteLoader size="md" color="#3453a7" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#3453a7]/10 flex items-center justify-center">
          <Bell className="w-6 h-6 text-[#3453a7]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#20335f]">الإشعارات</h1>
          <p className="text-gray-500 text-sm mt-1">سجل إشعاراتك وتنبيهاتك المهمة</p>
        </div>
      </div>

      {notificationPermission !== "granted" && !isPermissionCardDismissed && (
        <div className="border-b border-gray-100 bg-[#f8fbff] px-6 py-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-[#d8e4fb] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 text-right">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#3453a7]/10 text-[#3453a7]">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-black text-[#20335f]">هل تريد تفعيل إشعارات الجوال؟</div>
                <p className="mt-1 text-xs leading-6 text-[#6b7280]">وصلك التنبيه مباشرة عند وصول إشعار جديد.</p>
              </div>
            </div>

            {notificationPermission === "unsupported" ? (
              <div className="self-start rounded-full bg-[#fff7ed] px-4 py-2 text-sm font-bold text-[#c2410c] sm:self-center">
                هذا المتصفح لا يدعمها
              </div>
            ) : (
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={enableNativeNotifications}
                  disabled={isEnablingNativeNotifications}
                  className="rounded-full bg-[#3453a7] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#28448e] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isEnablingNativeNotifications ? "جاري التفعيل..." : "نعم"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPermissionCardDismissed(true)}
                  className="rounded-full border border-[#d8e4fb] px-4 py-2 text-sm font-bold text-[#526071] transition hover:bg-[#f8fbff]"
                >
                  لاحقًا
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {subscriptionError ? (
        <div className="border-b border-gray-100 bg-[#fffaf3] px-6 py-4">
          <div className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-right text-sm font-semibold text-[#9a3412]">
            تعذر ربط هذا الجهاز بالإشعارات: {subscriptionError}
          </div>
        </div>
      ) : null}

      <div className="divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-400">لا توجد إشعارات جديدة</h3>
          </div>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className={`p-6 transition-colors ${!notification.is_read ? 'bg-[#3453a7]/[0.02]' : 'hover:bg-gray-50'}`}>
              <div className="flex items-start gap-4">
                <div className={`mt-1 flex-shrink-0 w-2 h-2 rounded-full ${!notification.is_read ? 'bg-[#3453a7]' : 'bg-transparent'}`} />
                <div className="flex-1">
                  <p className={`text-base leading-relaxed ${!notification.is_read ? 'font-bold text-[#20335f]' : 'text-gray-600'}`}>
                    {notification.message}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(notification.created_at).toLocaleString("ar-SA", {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteNotification(notification.id)}
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#f1d4d4] bg-white text-[#d14d4d] transition hover:bg-[#fff5f5]"
                  aria-label="حذف الإشعار"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
