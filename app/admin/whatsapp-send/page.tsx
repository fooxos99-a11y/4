"use client"

import { useEffect, useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useWhatsAppStatus } from "@/hooks/use-whatsapp-status"
import { MessageCircle, Send, Users, CheckCircle2, XCircle, Phone, CircleAlert, X } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { SiteLoader } from "@/components/ui/site-loader"
import { formatGuardianPhoneForDisplay } from "@/lib/phone-number"
import { getOfflineErrorMessage } from "@/lib/network-error"

interface Student {
  id: string
  name: string
  guardian_phone: string
  account_number: number
  halaqah?: string | null
}

type OutgoingImagePayload = {
  base64: string
  mimeType: string
  fileName: string
  previewUrl: string
}

const OUTBOUND_IMAGE_MAX_SIZE_BYTES = 50 * 1024 * 1024
const OUTBOUND_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const

const TEMPLATE_VARIABLES = [
  { token: "{name}", label: "اسم الطالب", sample: "أحمد محمد" },
  { token: "{halaqah}", label: "اسم الحلقة", sample: "حلقة أبي بن كعب" },
  { token: "{account_number}", label: "رقم الحساب", sample: "10234" },
  { token: "{guardian_phone}", label: "رقم ولي الأمر", sample: "0551234567" },
  { token: "{date}", label: "تاريخ اليوم", sample: "09/04/2026" },
] as const

function resolveMessageTemplate(template: string, student: Student) {
  const replacements: Record<string, string> = {
    "{name}": student.name || "",
    "{halaqah}": (student.halaqah || "").trim(),
    "{account_number}": student.account_number ? String(student.account_number) : "",
    "{guardian_phone}": formatGuardianPhoneForDisplay(student.guardian_phone),
    "{date}": new Intl.DateTimeFormat("ar-SA").format(new Date()),
  }

  return Object.entries(replacements).reduce(
    (result, [token, value]) => result.replaceAll(token, value),
    template,
  )
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
        return
      }

      reject(new Error("تعذر قراءة الصورة"))
    }
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة"))
    reader.readAsDataURL(file)
  })
}

function extractBase64FromDataUrl(dataUrl: string) {
  const separatorIndex = dataUrl.indexOf(",")
  return separatorIndex >= 0 ? dataUrl.slice(separatorIndex + 1) : dataUrl
}

export default function WhatsAppSendPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("الإرسال إلى أولياء الأمور");
  const { isReady: isWhatsAppReady, isLoading: isWhatsAppStatusLoading } = useWhatsAppStatus()

    // إدارة الرسائل الجاهزة المشتركة
    const [readyMessages, setReadyMessages] = useState<{id:number,text:string}[]>([])
    const [isLoadingReady, setIsLoadingReady] = useState(false)

    // جلب الرسائل الجاهزة من قاعدة البيانات
    const fetchReadyMessages = async () => {
      setIsLoadingReady(true)
      try {
        const res = await fetch("/api/whatsapp-ready-messages")
        const data = await res.json()
        if (data.messages) setReadyMessages(data.messages)
      } catch (e) {
        setReadyMessages([])
      } finally {
        setIsLoadingReady(false)
      }
    }

    // إضافة رسالة جاهزة
    const handleAddReadyMessage = async () => {
      if (!quickText.trim()) return
      try {
        const res = await fetch("/api/whatsapp-ready-messages", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({text: quickText})
        })
        const data = await res.json()
        if (data.message) {
          setQuickText("")
          fetchReadyMessages()
        }
      } catch {}
    }

    // حذف رسالة جاهزة
    const handleDeleteReadyMessage = async (id:number) => {
      try {
        await fetch("/api/whatsapp-ready-messages", {
          method: "DELETE",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({id})
        })
        fetchReadyMessages()
      } catch {}
    }

    useEffect(() => {
      fetchReadyMessages()
    }, [])
  const [isLoading, setIsLoading] = useState(true)
  const [students, setStudents] = useState<Student[]>([])
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [message, setMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedHalaqah, setSelectedHalaqah] = useState("all")
  const [isSending, setIsSending] = useState(false)
  const [sendResults, setSendResults] = useState<{ success: number; failed: number } | null>(null)
  const [imagePayload, setImagePayload] = useState<OutgoingImagePayload | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const router = useRouter()
  const { toast } = useToast()

    // نص مخصص للإدراج السريع
    const [quickText, setQuickText] = useState("")

  const clearImageSelection = () => {
    setImagePayload(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleImageSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!OUTBOUND_IMAGE_MIME_TYPES.includes(file.type as (typeof OUTBOUND_IMAGE_MIME_TYPES)[number])) {
      toast({
        title: "نوع غير مدعوم",
        description: "يمكن رفع صور JPG أو PNG أو WEBP فقط.",
        variant: "destructive",
      })
      event.target.value = ""
      return
    }

    if (file.size > OUTBOUND_IMAGE_MAX_SIZE_BYTES) {
      toast({
        title: "الصورة كبيرة جدًا",
        description: "الرجاء اختيار صورة أصغر ثم إعادة المحاولة.",
        variant: "destructive",
      })
      event.target.value = ""
      return
    }

    try {
      const previewUrl = await readFileAsDataUrl(file)
      setImagePayload({
        base64: extractBase64FromDataUrl(previewUrl),
        mimeType: file.type,
        fileName: file.name,
        previewUrl,
      })
    } catch (error) {
      console.error("Error reading outbound image:", error)
      toast({
        title: "تعذر قراءة الصورة",
        description: "حاول اختيار صورة أخرى أو أعد المحاولة.",
        variant: "destructive",
      })
      event.target.value = ""
    }
  }

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      fetchStudents()
    }
  }, [router])

  useEffect(() => {
    let nextStudents = [...students]

    if (selectedHalaqah !== "all") {
      nextStudents = nextStudents.filter(
        (student) => (student.halaqah || "").trim() === selectedHalaqah,
      )
    }

    if (searchTerm.trim()) {
      const normalizedSearch = searchTerm.toLowerCase()
      nextStudents = nextStudents.filter(
        (student) =>
          student.name.toLowerCase().includes(normalizedSearch) ||
          student.guardian_phone?.includes(searchTerm) ||
          student.account_number.toString().includes(searchTerm) ||
          (student.halaqah || "").toLowerCase().includes(normalizedSearch),
      )
    }

    setFilteredStudents(nextStudents)
  }, [searchTerm, selectedHalaqah, students])

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/students")
      const data = await response.json()

      if (data.students) {
        // فلترة الطلاب الذين لديهم أرقام أولياء أمور
        const studentsWithPhones = data.students.filter(
          (s: Student) => s.guardian_phone && s.guardian_phone.trim() !== ""
        )
        setStudents(studentsWithPhones)
        setFilteredStudents(studentsWithPhones)
      }
    } catch (error) {
      console.error("Error fetching students:", error)
      toast({
        title: "خطأ",
        description: "فشل في جلب بيانات الطلاب",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectAll = () => {
    const filteredIds = filteredStudents.map((student) => student.id)
    const areAllFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedStudents.includes(id))

    if (areAllFilteredSelected) {
      setSelectedStudents((prev) => prev.filter((id) => !filteredIds.includes(id)))
      return
    }

    setSelectedStudents((prev) => Array.from(new Set([...prev, ...filteredIds])))
  }

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const handleSendMessages = async () => {
    if (isWhatsAppStatusLoading) {
      return
    }

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast({
        title: "لا يوجد اتصال بالإنترنت",
        description: "تحقق من اتصالك بالإنترنت ثم أعد المحاولة.",
        variant: "destructive",
      })
      return
    }

    if (!isWhatsAppReady) {
      toast({
        title: "واتساب غير مربوط",
        description: "يجب ربط واتساب أولاً من نافذة باركود الواتساب قبل إرسال الرسائل.",
        variant: "destructive",
      })
      return
    }

    if (selectedStudents.length === 0) {
      toast({
        title: "تنبيه",
        description: "الرجاء اختيار طالب واحد على الأقل",
        variant: "destructive",
      })
      return
    }

    if (!message.trim() && !imagePayload) {
      toast({
        title: "تنبيه",
        description: "الرجاء كتابة نص الرسالة أو إرفاق صورة",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)
    setSendResults(null)

    const selectedStudentsData = students.filter((s) => selectedStudents.includes(s.id))

    try {
      const response = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          media: imagePayload
            ? {
                mimeType: imagePayload.mimeType,
                base64: imagePayload.base64,
                fileName: imagePayload.fileName,
              }
            : null,
          recipients: selectedStudentsData.map((student) => ({
            phoneNumber: student.guardian_phone,
            message: resolveMessageTemplate(message, student),
          })),
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.error || "فشل في تجهيز رسائل واتساب")
      }

      const successCount = Number(data.queuedCount) || 0
      const failedCount = Number(data.failedCount) || 0

      setSendResults({ success: successCount, failed: failedCount })
      setIsSending(false)

      if (successCount > 0) {
      toast({
        title: "تم تجهيز الرسائل",
        description: `تم تجهيز ${successCount} رسالة واتساب${failedCount > 0 ? ` وتعذر تجهيز ${failedCount}` : ""}`,
      })

      // إعادة تعيين النموذج
      setMessage("")
      clearImageSelection()
      setSelectedStudents([])
      } else {
      toast({
        title: "فشل",
        description: data.error || "لم يتم تجهيز أي رسالة للإرسال",
        variant: "destructive",
      })
      }
    } catch (error) {
      setIsSending(false)
      const offlineMessage = getOfflineErrorMessage(error)
      toast({
        title: offlineMessage || "فشل",
        description: offlineMessage || (error instanceof Error ? error.message : "حدث خطأ أثناء تجهيز رسائل واتساب"),
        variant: "destructive",
      })
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

  const halaqahOptions = Array.from(
    new Set(
      students
        .map((student) => (student.halaqah || "").trim())
        .filter(Boolean),
    ),
  ).sort((first, second) => first.localeCompare(second, "ar"))

  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudents.includes(student.id))

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 py-4 md:py-8 lg:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-[2200px] px-2 md:px-8 lg:px-16">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-2 flex items-center gap-3">
                  <MessageCircle className="w-8 h-8 text-[#3453a7]" />
                  الإرسال إلى أولياء الأمور
                </h1>
              </div>
              <Button
                variant="outline"
                onClick={() => router.push("/admin/whatsapp-replies")}
                className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600"
              >
                <MessageCircle className="w-4 h-4 ml-2" />
                عرض الردود
              </Button>
            </div>

            {!isWhatsAppStatusLoading && !isWhatsAppReady ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                واتساب غير مربوط حالياً. اربط الحساب أولاً من نافذة باركود الواتساب قبل إرسال الرسائل إلى أولياء الأمور.
              </div>
            ) : null}

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* تم حذف مربعي المحددون ومعهم واتساب */}
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Message Composer */}
              <div className="lg:col-span-1">
                <Card className="border-2 border-[#3453a7]/20">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-[#1a2332]">كتابة الرسالة</CardTitle>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#3453a7]/20 bg-[#3453a7]/5 text-[#3453a7] transition hover:bg-[#3453a7]/10"
                            aria-label="عرض متغيرات الرسالة"
                          >
                            <CircleAlert className="h-4 w-4" />
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent align="end" className="w-80 border border-[#3453a7]/15 bg-white text-right shadow-xl">
                          <div className="space-y-3">
                            <div>
                              <p className="text-sm font-bold text-[#1a2332]">المتغيرات المتاحة</p>
                              <p className="mt-1 text-xs text-gray-500">تُستبدل تلقائياً لكل طالب عند الإرسال.</p>
                            </div>
                            <div className="space-y-2">
                              {TEMPLATE_VARIABLES.map((variable) => (
                                <div key={variable.token} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-xs font-bold text-[#3453a7]">{variable.token}</span>
                                    <span className="text-xs text-[#1a2332]">{variable.label}</span>
                                  </div>
                                  <p className="mt-1 text-xs text-gray-500">مثال: {variable.sample}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="message">نص الرسالة</Label>
                      <div className="flex gap-2 mb-2 items-center">
                        <Input
                          type="text"
                          placeholder="اكتب نص لإضافته كرسالة جاهزة"
                          value={quickText}
                          onChange={e => setQuickText(e.target.value)}
                          className="text-xs w-2/3"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600"
                          onClick={handleAddReadyMessage}
                        >
                          إضافة
                        </Button>
                      </div>
                      {/* قائمة الرسائل الجاهزة */}
                      <div className="space-y-1 mb-2">
                        {isLoadingReady ? (
                          <div className="py-1"><SiteLoader /></div>
                        ) : readyMessages.length === 0 ? (
                          <div className="text-xs text-gray-400">لا توجد رسائل جاهزة</div>
                        ) : (
                          readyMessages.map(msg => (
                            <div key={msg.id} className="flex items-center gap-2 bg-gray-100 rounded px-2 py-1">
                              <span className="flex-1 text-xs text-gray-700">{msg.text}</span>
                              <div className="flex gap-2">
                                <Button type="button" size="sm" variant="outline" className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600" onClick={()=>setMessage(prev=>prev?prev+"\n"+msg.text:msg.text)}>
                                  إدراج
                                </Button>
                                <Button type="button" size="sm" variant="outline" className="text-sm h-9 rounded-lg border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600" onClick={()=>handleDeleteReadyMessage(msg.id)}>
                                  حذف
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      <Textarea
                        id="message"
                        placeholder="اكتب رسالتك هنا...."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={8}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-3 rounded-2xl border border-dashed border-[#3453a7]/25 bg-[#f8fbff] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <Label htmlFor="whatsapp-image" className="text-sm font-semibold text-[#1a2332]">إرفاق صورة</Label>
                        </div>
                        {imagePayload ? (
                          <button
                            type="button"
                            onClick={clearImageSelection}
                            aria-label="إزالة الصورة"
                            className="text-red-600 transition-colors hover:text-red-700"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        ) : null}
                      </div>

                      <input
                        ref={fileInputRef}
                        id="whatsapp-image"
                        type="file"
                        accept={OUTBOUND_IMAGE_MIME_TYPES.join(",")}
                        onChange={handleImageSelection}
                        className="hidden"
                      />

                      <div className="flex items-center gap-3 rounded-xl border border-[#3453a7]/15 bg-white px-3 py-3">
                        <div className="min-w-0 flex-1 text-sm text-[#1a2332]">
                          <span className="block truncate">{imagePayload?.fileName || "لا يوجد ملف محدد"}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-700 whitespace-nowrap"
                        >
                          رفع
                        </Button>
                      </div>

                      {imagePayload ? (
                        <div className="overflow-hidden rounded-2xl border border-[#3453a7]/15 bg-white">
                          <img
                            src={imagePayload.previewUrl}
                            alt="معاينة الصورة"
                            className="h-56 w-full object-cover"
                          />
                        </div>
                      ) : null}
                    </div>

                    {sendResults && (
                      <div className="space-y-2 rounded-lg bg-white p-4">
                        <h4 className="font-semibold text-[#1a2332]">نتائج الإرسال:</h4>
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم الإرسال إلى: {sendResults.success}</span>
                        </div>
                        {sendResults.failed > 0 && (
                          <div className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-4 h-4" />
                            <span>فشل: {sendResults.failed}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <Button
                      onClick={handleSendMessages}
                      disabled={isSending || isWhatsAppStatusLoading || !isWhatsAppReady || selectedStudents.length === 0 || (!message.trim() && !imagePayload)}
                      variant="outline"
                      className="w-full text-sm h-9 rounded-lg border-[#3453a7]/50 bg-[linear-gradient(135deg,#24428f_0%,#3453a7_55%,#4f73d1_100%)] !text-white hover:brightness-105 hover:!text-white focus-visible:!text-white active:!text-white disabled:!text-white disabled:opacity-60"
                    >
                      {isSending ? (
                        <>جاري الإرسال</>
                      ) : (
                        <>
                          <Send className="w-4 h-4 ml-2" />
                          إرسال
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Students List */}
              <div className="lg:col-span-2">
                <Card className="border-2 border-[#3453a7]/20">
                  <CardHeader>
                    <CardTitle className="text-[#1a2332]">اختيار الطلاب</CardTitle>
                    <CardDescription>حدد أولياء الأمور الذين تريد إرسال الرسالة لهم، ويمكنك التصفية حسب الحلقة</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Search & Select All */}
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto] gap-3">
                      <div>
                        <Input
                          type="text"
                          placeholder="بحث بالاسم أو رقم الهاتف أو الحلقة..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <Select value={selectedHalaqah} onValueChange={setSelectedHalaqah}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="كل الحلقات" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">كل الحلقات</SelectItem>
                          {halaqahOptions.map((halaqah) => (
                            <SelectItem key={halaqah} value={halaqah}>
                              {halaqah}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleSelectAll}
                        variant="outline"
                        className="text-sm h-9 rounded-lg border-[#3453a7]/50 text-neutral-600 whitespace-nowrap"
                      >
                        {allFilteredSelected
                          ? "إلغاء تحديد الكل"
                          : "تحديد الكل"}
                      </Button>
                    </div>

                    {/* Students Grid */}
                    <div className="max-h-[600px] overflow-y-auto space-y-2">
                      {filteredStudents.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p>لا توجد نتائج</p>
                        </div>
                      ) : (
                        filteredStudents.map((student) => (
                          <label
                            key={student.id}
                            className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-[#3453a7] ${
                              selectedStudents.includes(student.id)
                                ? "border-[#3453a7] bg-[#3453a7]/5"
                                : "border-gray-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.id)}
                              onChange={() => handleSelectStudent(student.id)}
                              className="w-5 h-5 text-[#3453a7] rounded"
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-[#1a2332]">{student.name}</p>
                              <p className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {formatGuardianPhoneForDisplay(student.guardian_phone)}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-[#3453a7]">
                                {(student.halaqah || "بدون حلقة").trim() || "بدون حلقة"}
                              </p>
                            </div>
                            <div className="text-sm text-gray-500">#{student.account_number}</div>
                          </label>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
