"use client"

import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Mail, Clock, CheckCircle, Archive, ArchiveX, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"

interface ContactMessage {
  id: string
  name: string
  subject: string
  message: string
  status: "unread" | "read" | "archived"
  created_at: string
}

const subjectLabels: Record<string, string> = {
  inquiry: "استفسار عام",
  registration: "التسجيل في الحلقات",
  programs: "الاستفسار عن البرامج",
  complaint: "شكوى أو اقتراح",
  other: "أخرى",
}

export default function ReportsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("تقارير الرسائل");

    // دالة لفتح السجل اليومي في نافذة جديدة
    const openDailyAttendance = () => {
      window.open("/admin/student-daily-attendance", "_blank")
    }
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread" | "read" | "archived">("all")

  useEffect(() => {
    if (!authVerified) return
    fetchMessages()
  }, [authVerified])

  const fetchMessages = async () => {
    try {
      const response = await fetch("/api/contact")
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error("[v0] Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "read" }),
      })

      if (response.ok) {
        setMessages(messages.map((msg) => (msg.id === id ? { ...msg, status: "read" as const } : msg)))
      }
    } catch (error) {
      console.error("[v0] Error updating message:", error)
    }
  }

  const archiveMessage = async (id: string) => {
    try {
      const response = await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "archived" }),
      })

      if (response.ok) {
        setMessages(messages.map((msg) => (msg.id === id ? { ...msg, status: "archived" as const } : msg)))
      }
    } catch (error) {
      console.error("[v0] Error archiving message:", error)
    }
  }

  const unarchiveMessage = async (id: string) => {
    try {
      const response = await fetch("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "read" }),
      })

      if (response.ok) {
        setMessages(messages.map((msg) => (msg.id === id ? { ...msg, status: "read" as const } : msg)))
      }
    } catch (error) {
      console.error("[v0] Error unarchiving message:", error)
    }
  }

  const deleteMessage = async (id: string) => {
    try {
      const response = await fetch(`/api/contact?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMessages(messages.filter((msg) => msg.id !== id))
      }
    } catch (error) {
      console.error("[v0] Error deleting message:", error)
    }
  }

  const filteredMessages = messages.filter((msg) => {
    if (filter === "all") return true
    return msg.status === filter
  })

  const unreadCount = messages.filter((msg) => msg.status === "unread").length

  const formatDate = (dateString: string) => {
    // تأكد من أن التاريخ يتم تفسيره كـ UTC إذا لم يحتوي على معلومات المنطقة الزمنية
    const date = new Date(dateString.includes("Z") || dateString.includes("+") ? dateString : dateString + "Z")
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "الآن"
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays === 1) return "منذ يوم واحد"
    if (diffInDays < 7) return `منذ ${diffInDays} أيام`

    return date.toLocaleDateString("ar-SA")
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />
      <main className="flex-1 py-12">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-[#1a2332] mb-2">التقارير والرسائل</h1>
            <p className="text-lg text-gray-600">جميع الرسائل المرسلة من صفحة تواصل معنا</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-2 border-[#3453a7] bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">إجمالي الرسائل</p>
                    <p className="text-3xl font-bold text-[#1a2332]">{messages.length}</p>
                  </div>
                  <Mail className="w-10 h-10 text-[#3453a7]" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#3453a7] bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">غير مقروءة</p>
                    <p className="text-3xl font-bold text-[#3453a7]">{unreadCount}</p>
                  </div>
                  <Clock className="w-10 h-10 text-[#3453a7]" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#3453a7] bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">مقروءة</p>
                    <p className="text-3xl font-bold text-[#3453a7]">
                      {messages.filter((m) => m.status === "read").length}
                    </p>
                  </div>
                  <CheckCircle className="w-10 h-10 text-[#3453a7]" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-[#3453a7] bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">مؤرشفة</p>
                    <p className="text-3xl font-bold text-[#3453a7]">
                      {messages.filter((m) => m.status === "archived").length}
                    </p>
                  </div>
                  <Archive className="w-10 h-10 text-[#3453a7]" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Buttons فقط */}
          <div className="flex flex-wrap gap-3 mb-6 items-center">
            <Button
              onClick={() => setFilter("all")}
              variant={filter === "all" ? "default" : "outline"}
              className={filter === "all" ? "bg-[#3453a7] hover:bg-[#4f73d1]" : ""}
            >
              الكل
            </Button>
            <Button
              onClick={() => setFilter("unread")}
              variant={filter === "unread" ? "default" : "outline"}
              className={filter === "unread" ? "bg-[#3453a7] hover:bg-[#4f73d1]" : ""}
            >
              غير مقروءة
            </Button>
            <Button
              onClick={() => setFilter("read")}
              variant={filter === "read" ? "default" : "outline"}
              className={filter === "read" ? "bg-[#3453a7] hover:bg-[#4f73d1]" : ""}
            >
              مقروءة
            </Button>
            <Button
              onClick={() => setFilter("archived")}
              variant={filter === "archived" ? "default" : "outline"}
              className={filter === "archived" ? "bg-[#3453a7] hover:bg-[#4f73d1]" : ""}
            >
              مؤرشفة
            </Button>
          </div>

          {/* Messages List */}
          {loading ? (
            <div className="flex min-h-[40vh] justify-center py-12">
              <SiteLoader />
            </div>
          ) : filteredMessages.length === 0 ? (
            <Card className="min-h-[40vh] border-2 border-gray-300">
              <CardContent className="p-6 sm:p-12 text-center">
                <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600">لا توجد رسائل</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <Card
                  key={message.id}
                  className={`border-2 transition-all duration-200 hover:shadow-lg ${
                    message.status === "unread"
                      ? "border-[#3453a7] bg-[#fef9f0]"
                      : message.status === "archived"
                        ? "border-gray-300 bg-gray-50"
                        : "border-gray-300 bg-white"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl text-[#1a2332]">{message.name}</CardTitle>
                          <Badge
                            variant={message.status === "unread" ? "default" : "secondary"}
                            className={
                              message.status === "unread"
                                ? "bg-[#3453a7]"
                                : message.status === "archived"
                                  ? "bg-gray-600"
                                  : "bg-[#4f73d1]"
                            }
                          >
                            {message.status === "unread"
                              ? "جديدة"
                              : message.status === "archived"
                                ? "مؤرشفة"
                                : "مقروءة"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="font-semibold">{subjectLabels[message.subject]}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(message.created_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {message.status === "unread" && (
                          <Button
                            onClick={() => markAsRead(message.id)}
                            size="sm"
                            className="bg-[#3453a7] hover:bg-[#4f73d1]"
                          >
                            <CheckCircle className="w-4 h-4 ml-1" />
                            تعليم كمقروءة
                          </Button>
                        )}
                        {message.status === "archived" ? (
                          <Button
                            onClick={() => unarchiveMessage(message.id)}
                            size="sm"
                            className="bg-[#3453a7] hover:bg-[#4f73d1]"
                          >
                            <ArchiveX className="w-4 h-4 ml-1" />
                            إلغاء الأرشفة
                          </Button>
                        ) : (
                          <Button
                            onClick={() => archiveMessage(message.id)}
                            size="sm"
                            variant="outline"
                            className="border-gray-400"
                          >
                            <Archive className="w-4 h-4 ml-1" />
                            أرشفة
                          </Button>
                        )}
                        <Button
                          onClick={() => deleteMessage(message.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-400 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 ml-1" />
                          حذف
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base text-gray-700 leading-relaxed whitespace-pre-wrap">{message.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
