"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { toast } from "@/hooks/use-toast"
import { UserPlus } from "lucide-react"

export function GlobalAddStudentDialog() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const showAlert = useAlertDialog()
  
  const [isOpen, setIsOpen] = useState(false)
  
  // States needed
  const [newStudentName, setNewStudentName] = useState("")
  const [newStudentAccountNumber, setNewStudentAccountNumber] = useState("")
  const [newStudentIdNumber, setNewStudentIdNumber] = useState("")
  const [newGuardianPhone, setNewGuardianPhone] = useState("")
  const [selectedCircleToAdd, setSelectedCircleToAdd] = useState("")
  const [circles, setCircles] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingCircles, setIsLoadingCircles] = useState(false)

  // Listen to searchParams to open dialog
  useEffect(() => {
    if (searchParams?.get("action") === "add-student") {
      setIsOpen(true)
      fetchCircles()
    } else {
      setIsOpen(false)
    }
  }, [searchParams, pathname])

  const fetchCircles = async () => {
    setIsLoadingCircles(true)
    try {
      const response = await fetch("/api/circles", { cache: "no-store" })
      const data = await response.json()
      if (response.ok && data.circles) {
        setCircles(data.circles)
      } else {
        setCircles([])
      }
    } catch (e) {
      console.error(e)
      setCircles([])
    } finally {
      setIsLoadingCircles(false)
    }
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    void fetchCircles()
  }, [isOpen])

  const handleClose = (open: boolean) => {
    if (!open) {
      // remove the action parameter from URL
      const currentSearchParams = new URLSearchParams(searchParams?.toString() || "");
      currentSearchParams.delete("action");
      const newQuery = currentSearchParams.toString();
      const targetUrl = newQuery ? `?${newQuery}` : (pathname || "/");
      router.push(targetUrl, { scroll: false });
    }
  }

  const handleAddStudent = async () => {
    if (newStudentName.trim() && newStudentIdNumber.trim() && newStudentAccountNumber.trim() && selectedCircleToAdd) {
      setIsSubmitting(true)
      try {
        const response = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newStudentName,
            circle_name: selectedCircleToAdd,
            id_number: newStudentIdNumber,
            guardian_phone: newGuardianPhone,
            account_number: Number.parseInt(newStudentAccountNumber),
            initial_points: 0,
          }),
        })

        const data = await response.json()

        if (response.ok) {
          toast({
            title: "✓ تم الحفظ بنجاح",
            description: `تم إضافة الطالب ${newStudentName} إلى ${selectedCircleToAdd} بنجاح`,
            className: "bg-gradient-to-r from-[#3453a7] to-[#4f73d1] text-white border-none",
          })
          setNewStudentName("")
          setNewStudentIdNumber("")
          setNewStudentAccountNumber("")
          setNewGuardianPhone("")
          handleClose(false)
        } else {
          await showAlert(data.error || "فشل في إضافة الطالب", "خطأ")
        }
      } catch (error) {
        console.error(error)
        await showAlert("حدث خطأ أثناء إضافة الطالب", "خطأ")
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-white rounded-2xl p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-6 py-5 border-b border-[#3453a7]/30 bg-gradient-to-r from-[#3453a7]/8 to-transparent">
          <DialogTitle className="relative w-full text-center text-lg font-bold text-[#1a2332]">
            <UserPlus className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4f73d1]" />
            <span>إضافة طالب جديد</span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1a2332]">اسم الطالب</label>
              <Input
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                placeholder="الاسم الكامل"
                className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1a2332]">رقم الحساب</label>
              <Input
                value={newStudentAccountNumber}
                onChange={(e) => setNewStudentAccountNumber(e.target.value)}
                placeholder="00000"
                className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
                dir="ltr"
                type="number"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1a2332]">رقم الهوية</label>
              <Input
                value={newStudentIdNumber}
                onChange={(e) => setNewStudentIdNumber(e.target.value)}
                placeholder="1xxxxxxxxx"
                className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1a2332]">رقم جوال ولي الأمر</label>
              <Input
                value={newGuardianPhone}
                onChange={(e) => setNewGuardianPhone(e.target.value)}
                placeholder="0555555555"
                className="rounded-xl border-[#3453a7]/40 focus-visible:ring-[#3453a7]/30 focus-visible:border-[#3453a7] text-sm h-10"
                dir="ltr"
                type="tel"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1a2332]">الحلقة</label>
            <Select value={selectedCircleToAdd} onValueChange={setSelectedCircleToAdd}>
              <SelectTrigger className="rounded-xl border-[#3453a7]/40 focus:border-[#3453a7] h-10 text-sm">
                <SelectValue placeholder={isLoadingCircles ? "جاري تحميل الحلقات..." : circles.length > 0 ? "اختر الحلقة" : "لا توجد حلقات متاحة"} />
              </SelectTrigger>
              <SelectContent key={circles.map((circle) => String(circle.name)).join("|")}>
                {circles.map((circle) => (
                  <SelectItem key={circle.name} value={circle.name}>
                    {circle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#3453a7]/25 flex gap-3">
          <Button
            onClick={handleAddStudent}
            disabled={!newStudentName.trim() || !newStudentIdNumber.trim() || !newStudentAccountNumber.trim() || !selectedCircleToAdd || isSubmitting}
            className="flex-1 h-10 rounded-lg bg-[#3453a7] text-white font-medium transition-colors hover:bg-[#24428f] border-none disabled:bg-[#8ea2df] disabled:text-white disabled:opacity-100 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ"}
          </Button>
          <Button variant="outline" onClick={() => handleClose(false)}
            className="border-[#3453a7]/40 text-neutral-600 rounded-xl h-10">
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
