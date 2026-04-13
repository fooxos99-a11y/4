"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { MessageCircle, Search, CheckCheck, Send, Trash2, Mic } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"

interface Reply {
  id: string
  student_name: string
  sent_message_text: string
  sent_message_type?: string | null
  sent_media_mime_type?: string | null
  sent_media_base64?: string | null
  reply_message_text: string
  reply_type?: string | null
  media_mime_type?: string | null
  media_base64?: string | null
  is_read: boolean
}

function buildMediaSrc(base64: string | null | undefined, mimeType: string | null | undefined) {
  if (!base64 || !mimeType) {
    return null
  }

  return `data:${mimeType};base64,${base64}`
}

export default function WhatsAppRepliesPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الإرسال إلى أولياء الأمور");

  const [isLoading, setIsLoading] = useState(true)
  const [replies, setReplies] = useState<Reply[]>([])
  const [filteredReplies, setFilteredReplies] = useState<Reply[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [deletingReplyId, setDeletingReplyId] = useState<string | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const confirmDialog = useConfirmDialog()

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      fetchData()
    }
  }, [router])

  useEffect(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase()

    const filtered = replies.filter((reply) => {
      if (showUnreadOnly && reply.is_read) {
        return false
      }

      if (!normalizedSearchTerm) {
        return true
      }

      return (
        (reply.reply_message_text || "").toLowerCase().includes(normalizedSearchTerm) ||
        (reply.sent_message_text || "").toLowerCase().includes(normalizedSearchTerm) ||
        reply.student_name.toLowerCase().includes(normalizedSearchTerm)
      )
    })

    setFilteredReplies(filtered)
  }, [searchTerm, replies, showUnreadOnly])

  const fetchData = async () => {
    try {
      const repliesResponse = await fetch("/api/whatsapp/replies")
      const repliesData = await repliesResponse.json()

      if (repliesData.success && repliesData.replies) {
        setReplies(repliesData.replies)
        setFilteredReplies(repliesData.replies)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "خطأ",
        description: "فشل في جلب البيانات",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (replyId: string) => {
    try {
      const response = await fetch("/api/whatsapp/replies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId, isRead: true }),
      })

      if (response.ok) {
        setReplies((prev) => prev.map((r) => (r.id === replyId ? { ...r, is_read: true } : r)))
        toast({
          title: "تم",
          description: "تم تحديث حالة الرسالة",
        })
      }
    } catch (error) {
      console.error("Error updating reply:", error)
      toast({
        title: "خطأ",
        description: "فشل في تحديث الرسالة",
        variant: "destructive",
      })
    }
  }

  const deleteReply = async (replyId: string) => {
    const confirmed = await confirmDialog({
      title: "حذف الرد",
      description: "سيتم حذف هذا الرد من صفحة العرض. هل تريد المتابعة؟",
      confirmText: "حذف",
      cancelText: "تراجع",
    })

    if (!confirmed) {
      return
    }

    try {
      setDeletingReplyId(replyId)
      const response = await fetch("/api/whatsapp/replies", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ replyId }),
      })

      if (!response.ok) {
        throw new Error("delete failed")
      }

      setReplies((prev) => prev.filter((reply) => reply.id !== replyId))
      toast({
        title: "تم",
        description: "تم حذف الرد",
      })
    } catch (error) {
      console.error("Error deleting reply:", error)
      toast({
        title: "خطأ",
        description: "فشل في حذف الرد",
        variant: "destructive",
      })
    } finally {
      setDeletingReplyId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SiteLoader size="lg" />
      </div>
    )
  }

    if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-[#fafaf9]"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 py-4 md:py-8 lg:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-2 flex items-center gap-3">
                <MessageCircle className="w-8 h-8 text-[#3453a7]" />
                ردود أولياء الأمور
              </h1>
            </div>

            {/* Search */}
            <Card className="border-2 border-[#3453a7]/20">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div className="flex items-center gap-2 flex-1">
                    <Search className="w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="بحث بالاسم أو نص الرسالة..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                  <Button
                    type="button"
                    variant={showUnreadOnly ? "default" : "outline"}
                    onClick={() => setShowUnreadOnly((prev) => !prev)}
                    className={showUnreadOnly ? "bg-[#3453a7] hover:bg-[#274187]" : "border-[#3453a7]/30 text-[#3453a7]"}
                  >
                    غير المقروء فقط
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Replies List */}
            <Card className="border-2 border-[#3453a7]/20">
              <CardHeader>
                <CardTitle className="text-[#1a2332]">الردود المستلمة ({filteredReplies.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredReplies.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>لا توجد ردود</p>
                  </div>
                ) : (
                  filteredReplies.map((reply) => (
                    (() => {
                      const replyAudioSrc = buildMediaSrc(reply.media_base64, reply.media_mime_type)
                      const sentImageSrc = buildMediaSrc(reply.sent_media_base64, reply.sent_media_mime_type)

                      return (
                    <div
                      key={reply.id}
                      className={`rounded-2xl border p-4 md:p-5 ${reply.is_read ? "border-slate-200 bg-white" : "border-[#cddcf6] bg-[#f7fbff]"}`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[#1a2332]">
                            {reply.is_read ? (
                              <CheckCheck className="h-5 w-5 text-green-600" />
                            ) : (
                              <MessageCircle className="h-5 w-5 text-[#3453a7]" />
                            )}
                            <h3 className="text-lg font-bold">{reply.student_name}</h3>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {!reply.is_read && (
                            <Button
                              onClick={() => markAsRead(reply.id)}
                              size="sm"
                              className="bg-[#3453a7] hover:bg-[#274187]"
                            >
                              تحديد كمقروء
                            </Button>
                          )}
                          <Button
                            onClick={() => void deleteReply(reply.id)}
                            size="sm"
                            variant="outline"
                            disabled={deletingReplyId === reply.id}
                            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="me-1.5 h-4 w-4" />
                            {deletingReplyId === reply.id ? "جاري الحذف..." : "حذف"}
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-[#3453a7]/20 bg-[#3453a7]/5 p-4">
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3453a7]">
                            <Send className="h-4 w-4" />
                            الرسالة المرسلة
                          </div>
                          {sentImageSrc ? (
                            <div className="space-y-3">
                              <img
                                src={sentImageSrc}
                                alt="الصورة المرسلة"
                                className="h-48 w-full rounded-xl border border-[#3453a7]/15 object-cover"
                              />
                              {reply.sent_message_text ? (
                                <p className="whitespace-pre-wrap text-sm leading-7 text-[#1a2332]">{reply.sent_message_text}</p>
                              ) : (
                                <p className="text-sm leading-7 text-[#1a2332]">تم إرسال صورة بدون نص مرفق.</p>
                              )}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-7 text-[#1a2332]">{reply.sent_message_text}</p>
                          )}
                        </div>

                        <div className="rounded-xl border border-[#3453a7]/20 bg-[#3453a7]/5 p-4">
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3453a7]">
                            {reply.reply_type === "audio" || reply.reply_type === "ptt" ? <Mic className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                            أول رد من ولي الأمر
                          </div>
                          {replyAudioSrc ? (
                            <div className="space-y-3">
                              <audio controls preload="none" className="w-full">
                                <source src={replyAudioSrc} type={reply.media_mime_type || "audio/ogg"} />
                                المتصفح الحالي لا يدعم تشغيل الصوت.
                              </audio>
                              <p className="whitespace-pre-wrap text-sm leading-7 text-[#1a2332]">{reply.reply_message_text}</p>
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap text-sm leading-7 text-[#1a2332]">{reply.reply_message_text}</p>
                          )}
                        </div>
                      </div>
                    </div>
                      )
                    })()
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
