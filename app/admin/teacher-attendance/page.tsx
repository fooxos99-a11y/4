"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, Clock } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { SiteLoader } from "@/components/ui/site-loader"
import { formatSaudiTimeWithPeriod, getSaudiDateString } from "@/lib/saudi-time"
import { DEFAULT_TEACHER_ATTENDANCE_DELAY_MINUTES, TEACHER_ATTENDANCE_DELAY_SETTING_ID } from "@/lib/site-settings-constants"

interface AttendanceRecord {
  id: string
  teacher_id: string
  teacher_name: string
  account_number: number
  attendance_date: string
  check_in_time: string
  status: string
  created_at: string
  asrTime: string | null
  graceDeadline: string | null
  checkInTimeLocal: string | null
  isLate: boolean | null
  isEarly: boolean | null
  isOnTime: boolean | null
  timingCategory: "late" | "early" | "on-time" | null
  lateMinutes: number | null
  city: string
  graceMinutes: number
  source: string
}

export default function TeacherAttendancePage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("تقارير المعلمين");

  const [isLoading, setIsLoading] = useState(true)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [graceMinutes, setGraceMinutes] = useState(50)
  const [todayAsrTime, setTodayAsrTime] = useState<string | null>(null)
  const [currentSaudiDate, setCurrentSaudiDate] = useState(getSaudiDateString())
  const [selectedDate, setSelectedDate] = useState(getSaudiDateString())
  const [isDelayDialogOpen, setIsDelayDialogOpen] = useState(false)
  const [delayMinutes, setDelayMinutes] = useState(String(DEFAULT_TEACHER_ATTENDANCE_DELAY_MINUTES))
  const [isSavingDelay, setIsSavingDelay] = useState(false)
  const currentSaudiDateRef = useRef(currentSaudiDate)
  const router = useRouter()
  const showAlert = useAlertDialog()

  useEffect(() => {
    currentSaudiDateRef.current = currentSaudiDate
  }, [currentSaudiDate])

  useEffect(() => {
    const loggedIn = localStorage.getItem("isLoggedIn") === "true"
    const userRole = localStorage.getItem("userRole")

    if (!loggedIn || !userRole || userRole === "student" || userRole === "teacher" || userRole === "deputy_teacher") {
      router.push("/login")
    } else {
      fetchAttendanceRecords()
    }
  }, [router])

  useEffect(() => {
    const syncSaudiDate = () => {
      const nextSaudiDate = getSaudiDateString()
      const previousSaudiDate = currentSaudiDateRef.current

      if (nextSaudiDate === previousSaudiDate) {
        return
      }

      currentSaudiDateRef.current = nextSaudiDate
      setCurrentSaudiDate(nextSaudiDate)
      setSelectedDate((previousSelectedDate) => (previousSelectedDate === previousSaudiDate ? nextSaudiDate : previousSelectedDate))
    }

    const refreshData = () => {
      syncSaudiDate()
      void fetchAttendanceRecords()
    }

    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshData()
      }
    }

    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshData()
      }
    }, 60000)

    window.addEventListener("focus", refreshData)
    document.addEventListener("visibilitychange", refreshOnVisibility)

    return () => {
      window.removeEventListener("focus", refreshData)
      document.removeEventListener("visibilitychange", refreshOnVisibility)
      window.clearInterval(refreshInterval)
    }
  }, [])

  useEffect(() => {
    filterRecords()
  }, [attendanceRecords, selectedDate])

  const fetchAttendanceRecords = async () => {
    try {
      const response = await fetch("/api/teacher-attendance/all", { cache: "no-store" })
      const data = await response.json()

      if (data.records) {
        setAttendanceRecords(data.records)
      }

      if (typeof data.meta?.graceMinutes === "number") {
        setGraceMinutes(data.meta.graceMinutes)
        setDelayMinutes(String(data.meta.graceMinutes))
      }

      if (typeof data.meta?.todayDate === "string") {
        currentSaudiDateRef.current = data.meta.todayDate
        setCurrentSaudiDate(data.meta.todayDate)
      }

      setTodayAsrTime(typeof data.meta?.todayAsrTime === "string" ? data.meta.todayAsrTime : null)
    } catch (error) {
      console.error("[v0] Error fetching attendance:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterRecords = () => {
    let filtered = attendanceRecords
    // Filter by date only
    if (selectedDate) {
      filtered = filtered.filter((record) => record.attendance_date === selectedDate)
    }
    setFilteredRecords(filtered)
  }

  const handleSaveDelaySetting = async () => {
    const parsedMinutes = Number.parseInt(delayMinutes, 10)
    if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0) {
      await showAlert("أدخل مدة تأخير صحيحة بالدقائق", "تنبيه")
      return
    }

    try {
      setIsSavingDelay(true)
      const response = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: TEACHER_ATTENDANCE_DELAY_SETTING_ID,
          value: { minutes: parsedMinutes },
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "فشل في حفظ مدة التأخير")
      }

      setGraceMinutes(parsedMinutes)
      setDelayMinutes(String(parsedMinutes))
      setIsDelayDialogOpen(false)
      await fetchAttendanceRecords()
      await showAlert(`تم ضبط مدة التأخير إلى ${parsedMinutes} دقيقة بعد أذان العصر في بريدة`, "نجاح")
    } catch (error) {
      console.error("[teacher-attendance] Error saving teacher delay setting:", error)
      await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ مدة التأخير", "خطأ")
    } finally {
      setIsSavingDelay(false)
    }
  }

  const formatTime = (timestamp: string) => {
    try {
      return formatSaudiTimeWithPeriod(timestamp)
    } catch {
      return "-"
    }
  }

  const renderAttendanceStatus = (record: AttendanceRecord) => {
    if (record.status !== "present") {
      return <span className="text-red-600 font-bold">✗ لم يحضر</span>
    }

    if (record.timingCategory === "late") {
      return <span className="font-bold text-amber-600">متأخر {record.lateMinutes} د</span>
    }

    if (record.timingCategory === "early") {
      return <span className="text-emerald-600 font-bold">مبكر</span>
    }

    if (record.timingCategory === "on-time") {
      return <span className="text-sky-700 font-bold">حاضر</span>
    }

    return <span className="text-neutral-500 font-bold">حاضر</span>
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + "T00:00:00")
      return date.toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return dateString
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
      <Header />

      <main className="flex-1 py-4 md:py-8 lg:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-[#1a2332] mb-2">تحضير المعلمين</h1>
                <p className="text-gray-600">يحتسب التأخر بعد {graceMinutes} دقيقة من أذان العصر</p>
                <p className="mt-2 text-sm font-semibold text-[#3453a7]">أذان العصر اليوم: {todayAsrTime ? formatSaudiTimeWithPeriod(todayAsrTime) : "-"}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsDelayDialogOpen(true)}
                className="self-start border-[#3453a7]/50 bg-white text-[#4f73d1] hover:bg-[#3453a7]/10 hover:text-[#3453a7]"
              >
                مدة التأخير
              </Button>
            </div>

            {/* Filters Card */}
            <Card className="border-2 border-[#3453a7]/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#1a2332]">تحديد التاريخ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  {/* Date Filter Only */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-[#1a2332]">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-4 h-4" />
                        التاريخ
                      </div>
                    </Label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="text-base"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Table */}
            <Card className="border-2 border-[#3453a7]/20 shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#1a2332]">سجل الحضور</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right text-[#1a2332] font-bold text-lg">الاسم</TableHead>
                        <TableHead className="text-right text-[#1a2332] font-bold text-lg">رقم الحساب</TableHead>
                        <TableHead className="text-right text-[#1a2332] font-bold text-lg">التاريخ</TableHead>
                        <TableHead className="text-right text-[#1a2332] font-bold text-lg">
                          <div className="flex items-center gap-1">
                            <Clock className="w-5 h-5" />
                            وقت التحضير
                          </div>
                        </TableHead>
                        <TableHead className="text-right text-[#1a2332] font-bold text-lg">الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* تحقق من أن التاريخ ليس مستقبلي (اليوم مسموح) */}
                      {selectedDate > currentSaudiDate ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="text-gray-500">لا يمكن عرض بيانات الحضور لتاريخ مستقبلي</div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecords.length > 0 ? (
                          filteredRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-semibold text-[#1a2332] text-lg">{record.teacher_name}</TableCell>
                              <TableCell className="text-[#1a2332] text-lg">{record.account_number}</TableCell>
                              <TableCell className="text-[#1a2332] text-lg">{formatDate(record.attendance_date)}</TableCell>
                              <TableCell className="text-[#1a2332] font-mono text-lg font-semibold">
                                {record.checkInTimeLocal ? formatSaudiTimeWithPeriod(record.checkInTimeLocal) : formatTime(record.check_in_time)}
                              </TableCell>
                              <TableCell className="text-[#1a2332] text-lg">
                                {renderAttendanceStatus(record)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8">
                              <div className="text-gray-500">لا توجد سجلات للعرض في التاريخ المحدد</div>
                            </TableCell>
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={isDelayDialogOpen} onOpenChange={setIsDelayDialogOpen}>
        <DialogContent className="sm:max-w-[420px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl text-[#1a2332] text-right">مدة التأخير</DialogTitle>
            <DialogDescription className="text-sm text-neutral-500 text-right">يتم احتساب التأخير بعد أذان العصر في بريدة بهذه المدة</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 text-right">
            <div className="space-y-2">
              <Label htmlFor="teacherDelayMinutes" className="text-sm font-semibold text-[#1a2332]">عدد الدقائق بعد أذان العصر</Label>
              <Input
                id="teacherDelayMinutes"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(e.target.value)}
                placeholder="50"
                dir="ltr"
                type="number"
                min="0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3" dir="rtl">
            <Button variant="outline" onClick={() => setIsDelayDialogOpen(false)} className="border-[#3453a7]/50 text-neutral-600">إلغاء</Button>
            <Button onClick={handleSaveDelaySetting} disabled={isSavingDelay} className="bg-[#3453a7] hover:bg-[#24428f] text-white border-none disabled:bg-[#3453a7] disabled:text-white">
              {isSavingDelay ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
