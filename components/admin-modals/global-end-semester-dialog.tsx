"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "lucide-react"
import { useState } from "react"

export function GlobalEndSemesterDialog() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [semesterName, setSemesterName] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleOpenChange = (open: boolean) => {
    if (isSubmitting) return
    setIsOpen(open)
    if (!open) {
      const currentSearchParams = new URLSearchParams(searchParams?.toString() || "")
      currentSearchParams.delete("action")
      const query = currentSearchParams.toString()
      const targetUrl = query ? `${pathname}?${query}` : pathname
      router.replace(targetUrl || "/admin/profile", { scroll: false })
    }
  }

  const handleEndSemester = async () => {
    if (!semesterName.trim()) {
      setMessage({ type: "error", text: "أدخل اسم الفصل أولاً" })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const response = await fetch("/api/end-semester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: semesterName.trim() }),
      })
      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "فشل في إنهاء الفصل" })
        return
      }
      router.push("/admin/semesters")
    } catch {
      setMessage({ type: "error", text: "حدث خطأ أثناء تنفيذ إنهاء الفصل" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="relative w-full text-center text-xl text-[#1a2332]">
            <Calendar className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3453a7]" />
            <span>إنهاء الفصل</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 text-sm leading-7 text-[#1a2332]">
          <div>سيتم تنفيذ الإجراءات التالية:</div>
          <div>1. تصفير نقاط الطلاب ونقاط المتجر إلى 0.</div>
          <div>2. نقل حدود كل خطة حالية إلى محفوظ الطالب الدائم داخل الفصل المنتهي.</div>
          <div>3. أرشفة الفصل الحالي وإيقاف العمل اليومي حتى يتم بدء فصل جديد يدويًا.</div>
          <div>4. لن يتم حذف الطلاب أو المعلمين أو الإداريين أو أرقام حساباتهم أو بياناتهم الأساسية.</div>
        </div>
        {message && (
          <div className={`text-sm ${message.type === "success" ? "text-emerald-700" : "text-red-700"}`}>
            {message.text}
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="semester-name" className="block text-sm font-medium text-[#1a2332]">
            اسم الفصل المؤرشف
          </label>
          <Input
            id="semester-name"
            value={semesterName}
            onChange={(event) => setSemesterName(event.target.value)}
            placeholder="مثال: الفصل الأول 1448"
            disabled={isSubmitting}
            className="text-right"
            dir="rtl"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="border-[#3453a7]/60 text-neutral-700"
          >
            إغلاق
          </Button>
          <Button
            onClick={handleEndSemester}
            disabled={isSubmitting}
            className="bg-[#3453a7] text-white hover:bg-[#24428f] disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100"
          >
            {isSubmitting ? "جاري إنهاء وأرشفة الفصل..." : "إنهاء وأرشفة الفصل"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
