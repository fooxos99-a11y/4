"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle2 } from "lucide-react"
import { getSaudiDateString, getSaudiTimeString } from "@/lib/saudi-time"

interface TeacherAttendanceModalProps {
  isOpen: boolean
  onClose: () => void
  teacherId: string
  teacherName: string
  accountNumber: number
}

export function TeacherAttendanceModal({
  isOpen,
  onClose,
  teacherId,
  teacherName,
  accountNumber,
}: TeacherAttendanceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isCheckingToday, setIsCheckingToday] = useState(false)
  const [currentTime, setCurrentTime] = useState<string>("")
  const [hasCheckedToday, setHasCheckedToday] = useState(false)
  const [lastCheckInTime, setLastCheckInTime] = useState<string>("")
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      console.log("[v0] Teacher Attendance Modal opened with:", {
        teacherId,
        teacherName,
        accountNumber,
      })
    }
  }, [isOpen, teacherId, teacherName, accountNumber])
  // </CHANGE>

  // Update time display every second
  useEffect(() => {
    if (isOpen) {
      const updateTime = () => {
        setCurrentTime(getSaudiTimeString())
      }
      updateTime()
      const interval = setInterval(updateTime, 1000)
      return () => clearInterval(interval)
    }
  }, [isOpen])

  // Check if teacher has already checked in today
  useEffect(() => {
    if (isOpen && teacherId) {
      setIsCheckingToday(true)
      setHasCheckedToday(false)
      setLastCheckInTime("")
      void checkTodayAttendance()
    } else if (!isOpen) {
      setIsCheckingToday(false)
    }
  }, [isOpen, teacherId])

  const checkTodayAttendance = async () => {
    if (!teacherId) {
      console.error("[v0] No teacher ID provided")
      setHasCheckedToday(false)
      return
    }

    try {
      const today = getSaudiDateString()
      console.log("[v0] Checking attendance for:", { teacherId, date: today })

      const response = await fetch(`/api/teacher-attendance?teacher_id=${teacherId}&date=${today}`)

      if (!response.ok) {
        const error = await response.text()
        console.error("[v0] Failed to check attendance:", response.status, error)
        setHasCheckedToday(false)
        return
      }

      const data = await response.json()
      console.log("[v0] Attendance check result:", data)

      if (data.exists && data.record) {
        setHasCheckedToday(true)
        const checkInDate = new Date(data.record.check_in_time)
        setLastCheckInTime(
          checkInDate.toLocaleTimeString("ar-SA", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        )
      } else {
        setHasCheckedToday(false)
      }
    } catch (error) {
      console.error("[v0] Error checking attendance:", error)
      setHasCheckedToday(false)
    } finally {
      setIsCheckingToday(false)
    }
    // </CHANGE>
  }

  const handleAttendance = async (status: "present" | "absent") => {
    if (isSubmitting) return

    if (!teacherId || !teacherName || !accountNumber) {
      console.error("[v0] Missing required fields:", { teacherId, teacherName, accountNumber })
      alert("بيانات المعلم غير كاملة. الرجاء تسجيل الدخول مرة أخرى.")
      return
    }

    console.log("[v0] Starting attendance submission with:", {
      teacherId,
      teacherName,
      accountNumber,
      status,
    })

    setIsSubmitting(true)

    try {
      const now = new Date()
      const payload = {
        teacher_id: teacherId,
        teacher_name: teacherName,
        account_number: accountNumber,
        status,
        check_in_time: now.toISOString(),
      }

      console.log("[v0] Sending payload:", payload)

      const response = await fetch("/api/teacher-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      console.log("[v0] Response:", { status: response.status, data })

      if (response.ok && data.success) {
        console.log("[v0] Attendance submitted successfully")
        setIsSuccess(true)
        // Show success message for 1.5 seconds then close
        setTimeout(() => {
          setIsSuccess(false)
          setIsSubmitting(false)
          onClose()
        }, 1500)
      } else {
        console.error("[v0] Error submitting attendance:", data.error)
        alert(`حدث خطأ أثناء تسجيل الحضور: ${data.error || "خطأ غير معروف"}`)
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error("[v0] Exception during attendance submission:", error)
      alert("حدث خطأ أثناء تسجيل الحضور. الرجاء التأكد من الاتصال بالإنترنت.")
      setIsSubmitting(false)
    }
    // </CHANGE>
  }

  // Success state
  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent showCloseButton={false} className="max-w-[95vw] md:max-w-[500px] text-center">
          <div className="py-8">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-20 h-20 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#1a2332] mb-2">تم التحضير بنجاح</h2>
            <p className="text-lg text-[#1a2332]/70">شكراً لك</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (isOpen && isCheckingToday) {
    return null
  }

  if (hasCheckedToday) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent showCloseButton={false} className="max-w-[95vw] md:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-[#1a2332]">تم التسجيل مسبقاً</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-right">
            <p className="text-lg text-[#1a2332] mb-2">تم تسجيل حضورك اليوم</p>
            <p className="text-sm text-gray-500">آخر تحضير: {lastCheckInTime}</p>
          </div>
          <div className="flex justify-end border-t border-[#3453a7]/20 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#3453a7]/40 text-neutral-600 rounded-xl h-10"
            >
              إغلاق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isSubmitting && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-[95vw] md:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#1a2332]">تسجيل الحضور</DialogTitle>
        </DialogHeader>

        <div className="py-6 space-y-4">
          {/* Current Time Display */}
          <div className="bg-gradient-to-br from-[#3453a7]/10 to-[#3453a7]/10 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-[#3453a7]" />
              <span className="text-sm font-semibold text-[#1a2332]">الوقت الحالي</span>
            </div>
            <div className="text-3xl font-bold text-[#1a2332] font-mono">{currentTime || "00:00:00"}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => !isSubmitting && onClose()}
            className="text-sm h-9 min-w-24 rounded-lg border-[#3453a7]/50 text-neutral-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            onClick={() => handleAttendance("present")}
            className="text-sm h-9 min-w-24 rounded-lg border-[#3453a7]/50 text-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed"
            variant="outline"
            disabled={isSubmitting}
          >
            {isSubmitting ? "جاري التحضير..." : "حاضر"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
