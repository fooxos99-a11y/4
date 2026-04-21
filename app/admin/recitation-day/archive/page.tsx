"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SiteLoader } from "@/components/ui/site-loader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useToast } from "@/hooks/use-toast"
import { Archive, ArrowRight, Trash2 } from "lucide-react"

type ArchiveDayRow = {
  id: string
  recitation_date: string
  recitation_end_date?: string | null
  halaqah?: string | null
}

type StudentRow = {
  id: string
  student_name: string
  halaqah?: string | null
  teacher_name?: string | null
  overall_status: string
  evaluator_name?: string | null
  heard_amount_text?: string | null
  notes?: string | null
}

const tableHeadClassName = "h-12 whitespace-nowrap align-middle text-right text-sm font-bold text-[#1a2332]"

function getRecitationDateRangeLabel(startDate?: string | null, endDate?: string | null) {
  const normalizedStartDate = String(startDate || "").trim()
  const normalizedEndDate = String(endDate || "").trim() || normalizedStartDate

  if (!normalizedStartDate) {
    return "-"
  }

  return normalizedStartDate === normalizedEndDate
    ? normalizedStartDate
    : `من ${normalizedStartDate} إلى ${normalizedEndDate}`
}

function getArchiveHalaqahLabel(halaqah?: string | null) {
  return String(halaqah || "").trim() || "حلقة غير محددة"
}

function getStatusLabel(status?: string | null) {
  switch (status) {
    case "partial":
      return "سُمّع جزئيًا"
    case "completed":
      return "سُمّع كامل المحفوظ"
    case "repeat":
      return "يحتاج إعادة"
    case "postponed":
      return "مؤجل"
    default:
      return "لم يُسمّع"
  }
}

export default function RecitationDayArchivePage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("يوم السرد")
  const confirmDialog = useConfirmDialog()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isArchiveLoading, setIsArchiveLoading] = useState(false)
  const [deletingArchiveId, setDeletingArchiveId] = useState<string | null>(null)
  const [archiveDays, setArchiveDays] = useState<ArchiveDayRow[]>([])
  const [selectedArchiveDayId, setSelectedArchiveDayId] = useState("")
  const [archiveStudents, setArchiveStudents] = useState<StudentRow[]>([])
  const [selectedArchiveLabel, setSelectedArchiveLabel] = useState("")

  const selectedArchiveDay = useMemo(
    () => archiveDays.find((day) => day.id === selectedArchiveDayId) || null,
    [archiveDays, selectedArchiveDayId],
  )

  async function loadArchiveDayDetails(dayId: string) {
    setIsArchiveLoading(true)
    try {
      const response = await fetch(`/api/recitation-days/${dayId}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب تفاصيل الأرشيف")
      }

      setSelectedArchiveDayId(dayId)
      setArchiveStudents(data.students || [])
      setSelectedArchiveLabel(getRecitationDateRangeLabel(data.day?.recitation_date, data.day?.recitation_end_date))
    } catch (error) {
      toast({ title: "تعذر جلب تفاصيل الأرشيف", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setIsArchiveLoading(false)
    }
  }

  async function loadArchiveDays() {
    setIsLoading(true)
    try {
      const response = await fetch("/api/recitation-days?mode=archive", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب أرشيف السرد")
      }

      const nextArchiveDays = data.archiveDays || []
      setArchiveDays(nextArchiveDays)
      if (nextArchiveDays[0]?.id) {
        await loadArchiveDayDetails(nextArchiveDays[0].id)
      } else {
        setSelectedArchiveDayId("")
        setArchiveStudents([])
        setSelectedArchiveLabel("")
      }
    } catch (error) {
      toast({ title: "تعذر جلب أرشيف السرد", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function deleteArchiveDay(day: ArchiveDayRow) {
    const confirmed = await confirmDialog({
      title: "حذف الأرشيف",
      description: `سيتم حذف أرشيف ${getArchiveHalaqahLabel(day.halaqah)} بتاريخ ${getRecitationDateRangeLabel(day.recitation_date, day.recitation_end_date)} نهائيًا. هل تريد المتابعة؟`,
      confirmText: "حذف",
      cancelText: "إلغاء",
    })

    if (!confirmed) {
      return
    }

    setDeletingArchiveId(day.id)
    try {
      const response = await fetch(`/api/recitation-days/${day.id}`, { method: "DELETE" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر حذف الأرشيف")
      }

      await loadArchiveDays()
      toast({ title: "تم حذف الأرشيف", description: `تم حذف أرشيف ${getArchiveHalaqahLabel(day.halaqah)}` })
    } catch (error) {
      toast({ title: "تعذر حذف الأرشيف", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setDeletingArchiveId(null)
    }
  }

  useEffect(() => {
    if (authLoading || !authVerified) {
      return
    }

    void loadArchiveDays()
  }, [authLoading, authVerified])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fbff]" dir="rtl">
        <Header />
        <main className="flex min-h-[70vh] items-center justify-center"><SiteLoader size="md" color="#3453a7" /></main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fbff]" dir="rtl">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        <Card className="rounded-[30px] border-[#dde6f0] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
          <CardContent className="px-5 py-6 text-right md:px-6">
            <div className="flex items-center justify-start gap-3 text-2xl font-black text-[#1a2332]">
              <Link href="/admin/recitation-day" className="inline-flex items-center justify-center text-[#3453a7] transition hover:text-[#28448e]" aria-label="العودة">
                <ArrowRight className="h-6 w-6" />
              </Link>
              <Archive className="h-6 w-6 text-[#3453a7]" />أرشيف السرد
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <Card className="rounded-[30px] border-[#dde6f0] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <CardHeader className="text-right">
              <CardTitle className="text-xl font-black text-[#1a2332]">الحلقات المؤرشفة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {archiveDays.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d8e4fb] px-4 py-6 text-center text-sm text-[#64748b]">لا توجد حلقات مؤرشفة بعد</div>
              ) : archiveDays.map((day) => (
                <div key={day.id} className={`rounded-[22px] border px-4 py-4 transition-all ${selectedArchiveDayId === day.id ? "border-[#3453a7] bg-[#f5f8ff]" : "border-[#e5edf6] bg-white"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <button type="button" onClick={() => void loadArchiveDayDetails(day.id)} className="flex-1 text-right">
                      <div className="text-lg font-black text-[#1a2332]">{getArchiveHalaqahLabel(day.halaqah)}</div>
                      <div className="mt-2 text-sm text-[#64748b]">{getRecitationDateRangeLabel(day.recitation_date, day.recitation_end_date)}</div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void deleteArchiveDay(day)}
                      disabled={deletingArchiveId === day.id}
                      className="h-9 w-9 rounded-full p-0 text-[#b91c1c] hover:bg-[#fff1f2] hover:text-[#991b1b]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-[#dde6f0] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <CardContent className="pt-6">
              {isArchiveLoading ? (
                <div className="flex items-center justify-center py-16"><SiteLoader size="sm" color="#3453a7" /></div>
              ) : selectedArchiveDay ? (
                <div className="overflow-hidden rounded-[24px] border border-[#ebeff5] bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={tableHeadClassName}>الطالب</TableHead>
                        <TableHead className={tableHeadClassName}>الحلقة</TableHead>
                        <TableHead className={tableHeadClassName}>اسم المعلم</TableHead>
                        <TableHead className={tableHeadClassName}>حالة السرد</TableHead>
                        <TableHead className={tableHeadClassName}>المقيّم</TableHead>
                        <TableHead className={tableHeadClassName}>المسمّع</TableHead>
                        <TableHead className={tableHeadClassName}>الملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {archiveStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="text-right font-bold">{student.student_name}</TableCell>
                          <TableCell className="text-right">{student.halaqah || "-"}</TableCell>
                          <TableCell className="text-right">{student.teacher_name || "-"}</TableCell>
                          <TableCell className="text-right">{getStatusLabel(student.overall_status)}</TableCell>
                          <TableCell className="text-right">{student.evaluator_name || "-"}</TableCell>
                          <TableCell className="text-right">{student.heard_amount_text || "-"}</TableCell>
                          <TableCell className="max-w-[260px] text-right">{student.notes || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[#d8e4fb] px-4 py-10 text-center text-sm text-[#64748b]">لا توجد بيانات لعرضها</div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
