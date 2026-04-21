
"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Calendar, Settings2 } from "lucide-react"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { SiteLoader } from "@/components/ui/site-loader"
import { formatQuranRange } from "@/lib/quran-data"
import { isNonEvaluatedAttendance, translateAttendanceStatus } from "@/lib/student-attendance"
import {
  ATTENDANCE_SAVE_NOTIFICATION_SETTINGS_ID,
  DEFAULT_ATTENDANCE_SAVE_NOTIFICATION_TEMPLATES,
  normalizeAttendanceSaveNotificationTemplates,
  type AttendanceSaveNotificationTemplates,
} from "@/lib/attendance-save-notification-templates"

function translateLevel(level: string | null | undefined) {
  if (!level) return null;
  switch (level) {
    case "excellent": return "ممتاز";
    case "very_good": return "جيد جدًا";
    case "good": return "جيد";
    case "not_completed": return "لم يكمل";
    default: return null;
  }
}

function LevelBadge({ level }: { level: string | null | undefined }) {
  const label = translateLevel(level);
  if (!label) return <span className="text-gray-300">—</span>;
  const colors: Record<string, string> = {
    "ممتاز": "text-emerald-600",
    "جيد جدًا": "text-blue-600",
    "جيد": "text-amber-600",
    "لم يكمل": "text-red-500",
  };
  return (
    <span className={`text-base font-semibold ${colors[label] ?? "text-gray-500"}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "present") return <span className="text-base font-semibold text-emerald-600">حاضر</span>;
  if (status === "late") return <span className="text-base font-semibold text-orange-600">متأخر</span>;
  if (status === "excused") return <span className="text-base font-semibold text-amber-600">مستأذن</span>;
  if (status === "absent") return <span className="text-base font-semibold text-red-500">غائب</span>;
  return <span className="text-gray-400 text-base">{translateAttendanceStatus(status) || "—"}</span>;
}

interface AttendanceRecord {
  id: string
  student_id: string
  student_name: string
  halaqah?: string | null
  status: string | null
  created_at: string
  notes?: string | null
  hafiz_level?: string | null
  tikrar_level?: string | null
  samaa_level?: string | null
  rabet_level?: string | null
  hafiz_from_surah?: string | null
  hafiz_from_verse?: string | null
  hafiz_to_surah?: string | null
  hafiz_to_verse?: string | null
  samaa_from_surah?: string | null
  samaa_from_verse?: string | null
  samaa_to_surah?: string | null
  samaa_to_verse?: string | null
  rabet_from_surah?: string | null
  rabet_from_verse?: string | null
  rabet_to_surah?: string | null
  rabet_to_verse?: string | null
  attendance_date?: string
}

function formatReadingRange(fromSurah?: string | null, fromVerse?: string | null, toSurah?: string | null, toVerse?: string | null) {
  return formatQuranRange(fromSurah, fromVerse, toSurah, toVerse)
}

function EvaluationCell({ level, detail }: { level: string | null | undefined, detail?: string | null }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <LevelBadge level={level} />
      {detail && <span className="text-[11px] leading-4 text-neutral-500">{detail}</span>}
    </div>
  )
}

export default function StudentDailyAttendancePage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("السجل اليومي للطلاب");
  const showAlert = useAlertDialog()

  const [isLoading, setIsLoading] = useState(true)
  const [isFetchingRecords, setIsFetchingRecords] = useState(false)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [selectedCircle, setSelectedCircle] = useState("all")
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false)
  const [isSavingTemplates, setIsSavingTemplates] = useState(false)
  const [attendanceTemplatesForm, setAttendanceTemplatesForm] = useState<AttendanceSaveNotificationTemplates>(
    DEFAULT_ATTENDANCE_SAVE_NOTIFICATION_TEMPLATES,
  )

  const getSaudiDate = () => {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date());
  }

  const [selectedDate, setSelectedDate] = useState(getSaudiDate())
  useEffect(() => {
    if (!authLoading && authVerified) {
      fetchAttendanceRecords()
    }
  }, [authLoading, authVerified, selectedDate])

  useEffect(() => {
    filterRecords()
  }, [attendanceRecords, selectedDate, selectedCircle])

  useEffect(() => {
    if (!authLoading && authVerified) {
      void loadAttendanceTemplates()
    }
  }, [authLoading, authVerified])

  const fetchAttendanceRecords = async () => {
    setIsFetchingRecords(true)
    try {
      const response = await fetch(`/api/student-attendance/all?date=${selectedDate}`)
      if (!response.ok) throw new Error("فشل في جلب البيانات من السيرفر")
      const data = await response.json()
      setAttendanceRecords(Array.isArray(data.records) ? data.records : [])
    } catch (error) {
      setAttendanceRecords([])
      console.error("[v0] Error fetching attendance:", error)
    } finally {
      setIsFetchingRecords(false)
      setIsLoading(false)
    }
  }

  const loadAttendanceTemplates = async () => {
    try {
      const response = await fetch(`/api/site-settings?id=${ATTENDANCE_SAVE_NOTIFICATION_SETTINGS_ID}`, { cache: "no-store" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب قوالب رسائل ولي الأمر في التقييم اليومي")
      }

      setAttendanceTemplatesForm(normalizeAttendanceSaveNotificationTemplates(data.value))
    } catch (error) {
      console.error("Error loading attendance templates:", error)
    }
  }

  const saveAttendanceTemplates = async () => {
    try {
      setIsSavingTemplates(true)
      const response = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ATTENDANCE_SAVE_NOTIFICATION_SETTINGS_ID,
          value: attendanceTemplatesForm,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ القوالب")
      }

      setAttendanceTemplatesForm(normalizeAttendanceSaveNotificationTemplates(attendanceTemplatesForm))
      setIsTemplatesDialogOpen(false)
      await showAlert("تم حفظ قوالب رسائل ولي الأمر في التقييم اليومي", "نجاح")
    } catch (error) {
      await showAlert(error instanceof Error ? error.message : "تعذر حفظ القوالب", "خطأ")
    } finally {
      setIsSavingTemplates(false)
    }
  }

  const filterRecords = () => {
    setFilteredRecords(
      attendanceRecords.filter((r) => {
        const matchesDate = selectedDate ? r.attendance_date === selectedDate : true
        const matchesCircle = selectedCircle === "all" ? true : (r.halaqah || "") === selectedCircle
        return matchesDate && matchesCircle
      })
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <SiteLoader size="lg" />
      </div>
    )
  }

  const isFuture = (() => {
    return selectedDate > getSaudiDate();
  })();

  const sorted = [...filteredRecords].sort((a, b) => {
    const order: Record<string, number> = { absent: 0, excused: 1, late: 2, present: 3 };
    return (order[a.status ?? ""] ?? 3) - (order[b.status ?? ""] ?? 3);
  });

  const availableCircles = Array.from(
    new Set(
      attendanceRecords
        .map((record) => (record.halaqah || "").trim())
        .filter((circleName) => circleName.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b, "ar"))

  if (authLoading || !authVerified) return (<div className="min-h-screen flex items-center justify-center bg-white"><SiteLoader size="md" /></div>);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1 py-6 md:py-10 px-3 md:px-6">
        <div className="container mx-auto max-w-7xl space-y-6">

          {/* Page Header */}
          <div className="animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-[#1a2332] mb-1">السجل اليومي للطلاب</h1>
                <p className="text-gray-500 text-base">عرض حضور الطلاب حسب التاريخ</p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsTemplatesDialogOpen(true)}
                className="h-11 rounded-xl border-[#3453a7]/80 bg-white px-4 text-sm font-semibold text-neutral-700 transition-all hover:border-[#3453a7] hover:bg-[#3453a7]/10 focus-visible:border-[#3453a7] focus-visible:bg-[#3453a7]/10 focus-visible:ring-[#3453a7]/30"
              >
                <Settings2 className="me-2 h-4 w-4" />
                قوالب رسائل ولي الأمر في التقييم اليومي
              </Button>
            </div>
          </div>

          {/* Date Filter */}
          <Card className="border border-[#3453a7]/25 shadow-sm transition-shadow duration-300 hover:shadow-md animate-in fade-in slide-in-from-top-3 duration-500">
            <CardContent className="pt-5 pb-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#3453a7] flex-shrink-0" />
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-base border-[#3453a7]/40 focus-visible:ring-[#3453a7]/40 transition-all duration-200"
                  />
                </div>
                <div>
                  <Select value={selectedCircle} onValueChange={setSelectedCircle}>
                    <SelectTrigger className="text-base border-[#3453a7]/40 focus:ring-[#3453a7]/40">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      <SelectItem value="all">كل الحلقات</SelectItem>
                      {availableCircles.map((circle) => (
                        <SelectItem key={circle} value={circle}>{circle}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table Card */}
          <Card className="border border-[#3453a7]/25 shadow-sm transition-shadow duration-300 hover:shadow-md animate-in fade-in slide-in-from-bottom-3 duration-500">
            <CardContent className="pt-4">
              <div className="overflow-x-auto rounded-lg border border-[#3453a7]/15">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white border-b border-[#3453a7]/20 hover:bg-white">
                      <TableHead className="text-right text-[#1a2332] font-bold text-base">الحلقة</TableHead>
                      <TableHead className="text-right text-[#1a2332] font-bold text-base">اسم الطالب</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold w-24 px-1 text-base">الحفظ</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold w-24 px-1 text-base">التكرار</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold w-24 px-1 text-base">المراجعة</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold w-24 px-1 text-base">الربط</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold text-base">الحالة</TableHead>
                      <TableHead className="text-center text-[#1a2332] font-bold text-base">الملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isFuture ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                          لا يمكن عرض بيانات الحضور لتاريخ مستقبلي
                        </TableCell>
                      </TableRow>
                    ) : isFetchingRecords ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-12">
                          <div className="flex justify-center">
                            <SiteLoader size="md" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : sorted.length > 0 ? sorted.map((record, i) => (
                      <TableRow
                        key={record.id}
                        className="transition-colors duration-150 hover:bg-white border-b border-[#3453a7]/10"
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <TableCell className="font-medium text-neutral-600 text-base">{record.halaqah || "—"}</TableCell>
                        <TableCell className="font-semibold text-[#1a2332] text-base">{record.student_name}</TableCell>
                        <TableCell className="text-center">
                          {isNonEvaluatedAttendance(record.status)
                            ? <span className="text-gray-300">—</span>
                            : <EvaluationCell level={record.hafiz_level} detail={formatReadingRange(record.hafiz_from_surah, record.hafiz_from_verse, record.hafiz_to_surah, record.hafiz_to_verse)} />}
                        </TableCell>
                        <TableCell className="text-center px-1">
                          {isNonEvaluatedAttendance(record.status)
                            ? <span className="text-gray-300">—</span>
                            : <LevelBadge level={record.tikrar_level} />}
                        </TableCell>
                        <TableCell className="text-center px-1">
                          {isNonEvaluatedAttendance(record.status)
                            ? <span className="text-gray-300">—</span>
                            : <EvaluationCell level={record.samaa_level} detail={formatReadingRange(record.samaa_from_surah, record.samaa_from_verse, record.samaa_to_surah, record.samaa_to_verse)} />}
                        </TableCell>
                        <TableCell className="text-center px-1">
                          {isNonEvaluatedAttendance(record.status)
                            ? <span className="text-gray-300">—</span>
                            : <EvaluationCell level={record.rabet_level} detail={formatReadingRange(record.rabet_from_surah, record.rabet_from_verse, record.rabet_to_surah, record.rabet_to_verse)} />}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={record.status} />
                        </TableCell>
                        <TableCell className="text-center text-base max-w-[200px]">
                          {record.notes
                            ? <span className="text-neutral-600">{record.notes}</span>
                            : <span className="text-gray-300">—</span>}
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                          {selectedCircle === "all"
                            ? "لا توجد سجلات للعرض في التاريخ المحدد"
                            : "لا يوجد طلاب أو سجلات لهذه الحلقة في التاريخ المحدد"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>

      <Footer />

      <Dialog open={isTemplatesDialogOpen} onOpenChange={setIsTemplatesDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto" dir="rtl">
          <DialogHeader className="flex flex-row items-center justify-between gap-3 text-right">
            <DialogTitle className="text-right text-xl font-black text-[#1a2332]">قوالب رسائل ولي الأمر في التقييم اليومي</DialogTitle>
            <div className="group relative shrink-0 self-start">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d8e4fb] bg-white text-[#526071] shadow-sm transition-colors hover:border-[#3453a7]/40 hover:text-[#3453a7]"
                aria-label="المتغيرات المتاحة في القالب"
              >
                <AlertCircle className="h-[18px] w-[18px]" strokeWidth={2.2} />
              </button>
              <div className="pointer-events-none absolute left-0 top-11 z-20 hidden w-[320px] rounded-2xl border border-[#e6edf6] bg-white px-4 py-3 text-right text-sm leading-7 text-[#526071] shadow-lg group-hover:block">
                تُستخدم هذه الرسائل عند حفظ التحضير اليومي. المتغيرات المتاحة: {" "}
                <span className="font-bold">{'{name}'}</span> اسم الطالب، {" "}
                <span className="font-bold">{'{date}'}</span> التاريخ، {" "}
                <span className="font-bold">{'{status}'}</span> الحالة، {" "}
                <span className="font-bold">{'{hafiz_evaluation}'}</span> تقييم الحفظ، {" "}
                <span className="font-bold">{'{hafiz_amount}'}</span> مقدار الحفظ، {" "}
                <span className="font-bold">{'{tikrar_evaluation}'}</span> تقييم التكرار، {" "}
                <span className="font-bold">{'{samaa_evaluation}'}</span> تقييم المراجعة، {" "}
                <span className="font-bold">{'{rabet_evaluation}'}</span> تقييم الربط.
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2 text-right">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-bold text-[#1a2332]">رسالة الحاضر</div>
                <Textarea value={attendanceTemplatesForm.present} onChange={(e) => setAttendanceTemplatesForm((current) => ({ ...current, present: e.target.value }))} className="min-h-[140px] border-[#d8e4fb] text-right" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-[#1a2332]">رسالة المتأخر</div>
                <Textarea value={attendanceTemplatesForm.late} onChange={(e) => setAttendanceTemplatesForm((current) => ({ ...current, late: e.target.value }))} className="min-h-[140px] border-[#d8e4fb] text-right" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-[#1a2332]">رسالة الغائب</div>
                <Textarea value={attendanceTemplatesForm.absent} onChange={(e) => setAttendanceTemplatesForm((current) => ({ ...current, absent: e.target.value }))} className="min-h-[140px] border-[#d8e4fb] text-right" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-[#1a2332]">رسالة المستأذن</div>
                <Textarea value={attendanceTemplatesForm.excused} onChange={(e) => setAttendanceTemplatesForm((current) => ({ ...current, excused: e.target.value }))} className="min-h-[140px] border-[#d8e4fb] text-right" />
              </div>
            </div>
            <div className="flex justify-start gap-2">
              <Button variant="outline" onClick={() => setIsTemplatesDialogOpen(false)} className="h-11 rounded-full border-[#d8e4fb] px-6">
                إغلاق
              </Button>
              <Button onClick={saveAttendanceTemplates} disabled={isSavingTemplates} className="h-11 rounded-full border border-[#d8e4fb] bg-[#3453a7] px-6 text-white hover:bg-[#28448e] disabled:border-[#d8e4fb] disabled:bg-white disabled:text-white disabled:opacity-100">
                {isSavingTemplates ? "جاري الحفظ..." : "حفظ القوالب"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

