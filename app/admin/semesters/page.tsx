"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { SiteLoader } from "@/components/ui/site-loader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useToast } from "@/hooks/use-toast"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { isNonEvaluatedAttendance, translateAttendanceStatus } from "@/lib/student-attendance"

type SemesterSummary = {
  id: string
  name: string
  status: "active" | "archived"
  start_date: string
  end_date?: string | null
  archived_at?: string | null
  plans_count: number
  student_records_count: number
  absences_count: number
  finance_count: number
  is_active: boolean
}

type SemesterRelationStudent =
  | { name?: string | null; account_number?: number | null; halaqah?: string | null }
  | Array<{ name?: string | null; account_number?: number | null; halaqah?: string | null }>
  | null

type SemesterPlanRow = {
  id: string
  student_id?: string
  start_surah_name?: string | null
  end_surah_name?: string | null
  start_date?: string | null
  total_pages?: number | null
  total_days?: number | null
  daily_pages?: number | null
  muraajaa_pages?: number | null
  rabt_pages?: number | null
  direction?: string | null
  students?: SemesterRelationStudent
}

type SemesterRecordEvaluation = {
  hafiz_level?: string | null
  tikrar_level?: string | null
  samaa_level?: string | null
  rabet_level?: string | null
}

type SemesterStudentRecordRow = {
  id: string
  student_id?: string
  date?: string | null
  status?: string | null
  notes?: string | null
  is_compensation?: boolean | null
  halaqah?: string | null
  evaluations?: SemesterRecordEvaluation[] | SemesterRecordEvaluation | null
  students?: SemesterRelationStudent
}

type SemesterDailyStudentRecordRow = {
  student_id: string
  student_name: string
  account_number?: number | null
  halaqah?: string | null
  date: string
  status?: string | null
  notes?: string | null
  is_compensation?: boolean | null
  hafiz_level?: string | null
  tikrar_level?: string | null
  samaa_level?: string | null
  rabet_level?: string | null
}

type SemesterAbsenceRow = {
  student_id: string
  name: string
  account_number?: number | null
  halaqah?: string | null
  absenceCount: number
  lastAbsenceDate?: string | null
  absenceDates?: string[]
}

type SemesterFinanceInvoiceRow = {
  id: string
  title?: string | null
  vendor?: string | null
  invoice_number?: string | null
  amount?: number | string | null
  issue_date?: string | null
  due_date?: string | null
  status?: string | null
}

type SemesterFinanceExpenseRow = {
  id: string
  title?: string | null
  beneficiary?: string | null
  payment_method?: string | null
  amount?: number | string | null
  expense_date?: string | null
}

type SemesterFinanceIncomeRow = {
  id: string
  title?: string | null
  source?: string | null
  amount?: number | string | null
  income_date?: string | null
}

type SemesterFinanceTripRow = {
  id: string
  title?: string | null
  trip_date?: string | null
  costs?: unknown
}

type SemesterStats = {
  students_count: number
  circles_count: number
  plans_count: number
  student_records_count: number
  absences_count: number
  present_count: number
  late_count: number
  excused_count: number
  earned_points: number
  memorized_pages: number
  revised_pages: number
  tied_pages: number
  invoices_total: number
  expenses_total: number
  incomes_total: number
  trips_total: number
  finance_count: number
}

type SemesterFinance = {
  invoices: SemesterFinanceInvoiceRow[]
  expenses: SemesterFinanceExpenseRow[]
  incomes: SemesterFinanceIncomeRow[]
  trips: SemesterFinanceTripRow[]
}

type AttendanceStatusFilter = "all" | "present" | "late" | "absent" | "excused" | "missing"
type SemesterFinanceTableRow = {
  id: string
  type: "invoice" | "expense" | "income" | "trip"
  typeLabel: string
  title: string
  entity: string
  amount: number
  date: string
}

const EMPTY_STATS: SemesterStats = {
  students_count: 0,
  circles_count: 0,
  plans_count: 0,
  student_records_count: 0,
  absences_count: 0,
  present_count: 0,
  late_count: 0,
  excused_count: 0,
  earned_points: 0,
  memorized_pages: 0,
  revised_pages: 0,
  tied_pages: 0,
  invoices_total: 0,
  expenses_total: 0,
  incomes_total: 0,
  trips_total: 0,
  finance_count: 0,
}

function getEvaluationRecord(value: SemesterStudentRecordRow["evaluations"]) {
  return Array.isArray(value) ? value[value.length - 1] || null : value || null
}

function formatAmount(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString("ar-SA")
}

function formatTripCosts(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return "0"
  return value.map((item) => formatAmount(Number(item || 0))).join(" + ")
}

function translateLevel(level: string | null | undefined) {
  if (!level) return "-"

  switch (level) {
    case "excellent":
      return "ممتاز"
    case "very_good":
      return "جيد جدًا"
    case "good":
      return "جيد"
    case "not_completed":
      return "لم يكمل"
    default:
      return level
  }
}

function normalizeStudentRelation(value: SemesterRelationStudent) {
  return Array.isArray(value) ? value[0] || null : value || null
}

function normalizeText(value: string | number | null | undefined) {
  return String(value || "").trim().toLocaleLowerCase("ar")
}

function matchesSearch(searchTerm: string, ...values: Array<string | number | null | undefined>) {
  if (!searchTerm.trim()) return true

  const needle = normalizeText(searchTerm)
  return values.some((value) => normalizeText(value).includes(needle))
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim() || "semester-archive"
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildFinanceRows(finance: SemesterFinance): SemesterFinanceTableRow[] {
  return [
    ...finance.invoices.map((invoice) => ({
      id: invoice.id,
      type: "invoice" as const,
      typeLabel: "فاتورة",
      title: invoice.title || "-",
      entity: invoice.vendor || invoice.invoice_number || "-",
      amount: Number(invoice.amount || 0),
      date: invoice.issue_date || "",
    })),
    ...finance.expenses.map((expense) => ({
      id: expense.id,
      type: "expense" as const,
      typeLabel: "مصروف",
      title: expense.title || "-",
      entity: expense.beneficiary || expense.payment_method || "-",
      amount: Number(expense.amount || 0),
      date: expense.expense_date || "",
    })),
    ...finance.incomes.map((income) => ({
      id: income.id,
      type: "income" as const,
      typeLabel: "إيراد",
      title: income.title || "-",
      entity: income.source || "-",
      amount: Number(income.amount || 0),
      date: income.income_date || "",
    })),
    ...finance.trips.map((trip) => ({
      id: trip.id,
      type: "trip" as const,
      typeLabel: "رحلة",
      title: trip.title || "-",
      entity: "-",
      amount: Array.isArray(trip.costs) ? trip.costs.reduce((sum, item) => sum + Number(item || 0), 0) : 0,
      date: trip.trip_date || "",
    })),
  ].sort((left, right) => right.date.localeCompare(left.date))
}

function getSemesterDurationDays(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return 0

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0
  }

  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
}

function formatSemesterDurationLabel(startDate?: string | null, endDate?: string | null) {
  const durationDays = getSemesterDurationDays(startDate, endDate)
  return durationDays > 0 ? `${durationDays} يوم` : "-"
}

function SectionHeader({
  title,
  isOpen,
  onToggle,
}: {
  title: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <CardHeader className="text-right">
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="icon" onClick={onToggle} className="h-9 w-9 rounded-full border border-[#d8e4fb] text-[#3453a7] hover:bg-[#f5f8ff] hover:text-[#2d478f]">
          <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`} />
        </Button>
        <CardTitle className="flex-1 text-right text-xl font-black text-[#1a2332]">{title}</CardTitle>
      </div>
    </CardHeader>
  )
}

export default function AdminSemestersPage() {
  const { isLoading: authLoading, isVerified } = useAdminAuth()
  const confirmDialog = useConfirmDialog()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isDeletingSemester, setIsDeletingSemester] = useState(false)
  const [isStartingSemester, setIsStartingSemester] = useState(false)
  const [semesters, setSemesters] = useState<SemesterSummary[]>([])
  const [activeSemester, setActiveSemester] = useState<SemesterSummary | null>(null)
  const [selectedSemesterId, setSelectedSemesterId] = useState("")
  const [selectedSemester, setSelectedSemester] = useState<SemesterSummary | null>(null)
  const [newSemesterName, setNewSemesterName] = useState("")
  const [newSemesterStartDate, setNewSemesterStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [plans, setPlans] = useState<SemesterPlanRow[]>([])
  const [dailyStudentRecords, setDailyStudentRecords] = useState<SemesterDailyStudentRecordRow[]>([])
  const [absences, setAbsences] = useState<SemesterAbsenceRow[]>([])
  const [stats, setStats] = useState<SemesterStats>(EMPTY_STATS)
  const [finance, setFinance] = useState<SemesterFinance>({ invoices: [], expenses: [], incomes: [], trips: [] })
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState("")
  const [isDailyRecordsLoading, setIsDailyRecordsLoading] = useState(false)
  const [selectedAbsenceStudentId, setSelectedAbsenceStudentId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCircle, setSelectedCircle] = useState("all")
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState<AttendanceStatusFilter>("all")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isPlansOpen, setIsPlansOpen] = useState(false)
  const [isRecordsOpen, setIsRecordsOpen] = useState(false)
  const [isAbsencesOpen, setIsAbsencesOpen] = useState(false)
  const [isFinanceOpen, setIsFinanceOpen] = useState(false)

  const refreshSemesters = async () => {
    const response = await fetch("/api/semesters", { cache: "no-store" })
    const data = await response.json()
    const allSemesters = (data.semesters || []) as SemesterSummary[]
    const loadedSemesters = allSemesters.filter((semester) => semester.status === "archived")
    setActiveSemester(allSemesters.find((semester) => semester.id === data.activeSemesterId) || null)
    setSemesters(loadedSemesters)
    return loadedSemesters
  }

  const handleStartSemester = async () => {
    if (!newSemesterName.trim()) {
      toast({ title: "خطأ", description: "أدخل اسم الفصل الجديد", variant: "destructive" })
      return
    }

    if (!newSemesterStartDate) {
      toast({ title: "خطأ", description: "حدد تاريخ بداية الفصل", variant: "destructive" })
      return
    }

    setIsStartingSemester(true)
    try {
      const response = await fetch("/api/semesters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSemesterName.trim(),
          start_date: newSemesterStartDate,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "تعذر بدء الفصل")
      }

      await refreshSemesters()
      setNewSemesterName("")
      toast({ title: "تم انشاء الفصل بنجاح" })
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "تعذر بدء الفصل الجديد",
        variant: "destructive",
      })
    } finally {
      setIsStartingSemester(false)
    }
  }

  useEffect(() => {
    async function loadSemesters() {
      try {
        const loadedSemesters = await refreshSemesters()
        setSelectedSemesterId(loadedSemesters.find((semester) => semester.status === "archived")?.id || loadedSemesters[0]?.id || "")
      } finally {
        setIsLoading(false)
      }
    }

    void loadSemesters()
  }, [])

  useEffect(() => {
    async function loadSemesterDetails() {
      if (!selectedSemesterId) {
        setSelectedSemester(null)
        setPlans([])
        setDailyStudentRecords([])
        setAbsences([])
        setStats(EMPTY_STATS)
        setFinance({ invoices: [], expenses: [], incomes: [], trips: [] })
        setSelectedAttendanceDate("")
        setSelectedAbsenceStudentId("")
        setSearchTerm("")
        setSelectedCircle("all")
        setAttendanceStatusFilter("all")
        setIsSearchOpen(false)
        setIsPlansOpen(false)
        setIsRecordsOpen(false)
        setIsAbsencesOpen(false)
        setIsFinanceOpen(false)
        return
      }

      const response = await fetch(`/api/semesters?semester_id=${encodeURIComponent(selectedSemesterId)}`, { cache: "no-store" })
      const data = await response.json()
      const activeSelection = semesters.find((semester) => semester.id === selectedSemesterId) || null
      setSelectedSemester(activeSelection)
      setPlans((data.plans || []) as SemesterPlanRow[])
      setAbsences((data.absences || []) as SemesterAbsenceRow[])
      setStats((data.stats || EMPTY_STATS) as SemesterStats)
      setFinance((data.finance || { invoices: [], expenses: [], incomes: [], trips: [] }) as SemesterFinance)
      setSelectedAttendanceDate(activeSelection?.end_date || activeSelection?.start_date || "")
      setSelectedAbsenceStudentId(((data.absences || []) as SemesterAbsenceRow[])[0]?.student_id || "")
      setSearchTerm("")
      setSelectedCircle("all")
      setAttendanceStatusFilter("all")
      setIsSearchOpen(false)
      setIsPlansOpen(false)
      setIsRecordsOpen(false)
      setIsAbsencesOpen(false)
      setIsFinanceOpen(false)
    }

    void loadSemesterDetails()
  }, [selectedSemesterId, semesters])

  useEffect(() => {
    async function loadDailyStudentRecords() {
      if (!selectedSemesterId || !selectedAttendanceDate) {
        setDailyStudentRecords([])
        return
      }

      setIsDailyRecordsLoading(true)
      try {
        const response = await fetch(
          `/api/semesters?semester_id=${encodeURIComponent(selectedSemesterId)}&attendance_date=${encodeURIComponent(selectedAttendanceDate)}`,
          { cache: "no-store" },
        )
        const data = await response.json()
        setDailyStudentRecords((data.dailyStudentRecords || []) as SemesterDailyStudentRecordRow[])
      } finally {
        setIsDailyRecordsLoading(false)
      }
    }

    void loadDailyStudentRecords()
  }, [selectedSemesterId, selectedAttendanceDate])

  const financeRows = useMemo(() => buildFinanceRows(finance), [finance])

  const semesterDateLabel = useMemo(() => {
    if (!selectedSemester) return ""
    return `من ${selectedSemester.start_date} إلى ${selectedSemester.end_date || "-"}`
  }, [selectedSemester])

  const semesterDurationLabel = useMemo(() => {
    if (!selectedSemester) return "-"
    return formatSemesterDurationLabel(selectedSemester.start_date, selectedSemester.end_date || selectedSemester.start_date)
  }, [selectedSemester])

  const circleOptions = useMemo(() => {
    const circleSet = new Set<string>()

    for (const plan of plans) {
      const student = normalizeStudentRelation(plan.students)
      if (student?.halaqah) {
        circleSet.add(student.halaqah)
      }
    }

    for (const record of dailyStudentRecords) {
      if (record.halaqah) {
        circleSet.add(record.halaqah)
      }
    }

    for (const absence of absences) {
      if (absence.halaqah) {
        circleSet.add(absence.halaqah)
      }
    }

    return Array.from(circleSet).sort((left, right) => left.localeCompare(right, "ar"))
  }, [absences, dailyStudentRecords, plans])

  const filteredPlans = useMemo(() => {
    return plans.filter((plan) => {
      const student = normalizeStudentRelation(plan.students)
      const matchesCircle = selectedCircle === "all" || student?.halaqah === selectedCircle

      return (
        matchesCircle &&
        matchesSearch(
          searchTerm,
          student?.name,
          student?.account_number,
          student?.halaqah,
          plan.start_surah_name,
          plan.end_surah_name,
        )
      )
    })
  }, [plans, searchTerm, selectedCircle])

  const filteredDailyStudentRecords = useMemo(() => {
    return dailyStudentRecords.filter((record) => {
      const matchesCircle = selectedCircle === "all" || record.halaqah === selectedCircle
      const normalizedStatus = record.status || "missing"
      const matchesStatus = attendanceStatusFilter === "all" || normalizedStatus === attendanceStatusFilter

      return matchesCircle && matchesStatus && matchesSearch(searchTerm, record.student_name, record.account_number, record.halaqah, record.notes)
    })
  }, [attendanceStatusFilter, dailyStudentRecords, searchTerm, selectedCircle])

  const filteredAbsences = useMemo(() => {
    return absences.filter((absence) => {
      const matchesCircle = selectedCircle === "all" || absence.halaqah === selectedCircle
      return matchesCircle && matchesSearch(searchTerm, absence.name, absence.account_number, absence.halaqah)
    })
  }, [absences, searchTerm, selectedCircle])

  const filteredFinanceRows = useMemo(() => {
    return financeRows.filter((row) => {
      return matchesSearch(searchTerm, row.title, row.entity, row.date, row.typeLabel)
    })
  }, [financeRows, searchTerm])

  const selectedAbsenceDates = useMemo(() => {
    const dates = selectedAbsenceStudentId
      ? filteredAbsences.find((absence) => absence.student_id === selectedAbsenceStudentId)?.absenceDates || []
      : []

    return [...dates].sort((left, right) => right.localeCompare(left))
  }, [filteredAbsences, selectedAbsenceStudentId])

  useEffect(() => {
    if (filteredAbsences.some((absence) => absence.student_id === selectedAbsenceStudentId)) {
      return
    }

    setSelectedAbsenceStudentId(filteredAbsences[0]?.student_id || "")
  }, [filteredAbsences, selectedAbsenceStudentId])

  const handleDeleteSemester = async () => {
    if (!selectedSemester || selectedSemester.status !== "archived") {
      return
    }

    const confirmed = await confirmDialog({
      title: "حذف الفصل المؤرشف",
      description: `سيتم حذف الفصل "${selectedSemester.name}" من الأرشيف. لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: "حذف الفصل",
      cancelText: "إلغاء",
    })

    if (!confirmed) {
      return
    }

    setIsDeletingSemester(true)
    try {
      const response = await fetch(`/api/semesters?semester_id=${encodeURIComponent(selectedSemester.id)}`, {
        method: "DELETE",
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "تعذر حذف الفصل")
      }

      const loadedSemesters = await refreshSemesters()
      const nextSelection = loadedSemesters.find((semester) => semester.status === "archived")?.id || loadedSemesters[0]?.id || ""
      setSelectedSemesterId(nextSelection)
      toast({ title: "تم الحذف", description: `تم حذف الفصل "${data.deletedSemesterName || selectedSemester.name}" من الأرشيف` })
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "تعذر حذف الفصل المؤرشف",
        variant: "destructive",
      })
    } finally {
      setIsDeletingSemester(false)
    }
  }

  const handleSelectAbsenceDate = (date: string) => {
    setSelectedAttendanceDate(date)
    document.getElementById("semester-daily-records")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const selectedAbsenceStudent = filteredAbsences.find((absence) => absence.student_id === selectedAbsenceStudentId) || null

  if (authLoading || isLoading || !isVerified) {
    return <div className="min-h-screen flex items-center justify-center bg-white"><SiteLoader size="lg" /></div>
  }

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <Header />
      <main className="px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <Card className="rounded-[30px] border-[#dbe5f1] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <CardHeader className="text-right">
              <CardTitle className="text-2xl font-black text-[#1a2332]">إدارة الفصل النشط</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeSemester ? (
                <div className="rounded-[24px] border border-[#d7e7d9] bg-[#f5fbf6] px-5 py-5 text-right">
                  <div className="text-lg font-black text-[#1a2332]">يوجد فصل نشط حاليًا: {activeSemester.name}</div>
                  <div className="mt-2 text-sm font-semibold text-[#4b5563]">تاريخ البداية: {activeSemester.start_date}</div>
                  <div className="mt-2 text-sm font-semibold text-[#198754]">لن يتم السماح ببدء فصل جديد حتى يتم إنهاء هذا الفصل أولًا.</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[#f1deb0] bg-[#fffaf1] px-5 py-4 text-right text-sm font-semibold text-[#8a6a22]">
                    لا يوجد فصل نشط حاليًا. لن يتمكن المعلمون أو المشرفون من تسجيل الحضور أو التقييم أو إنشاء الخطط حتى تبدأ فصلًا جديدًا يدويًا.
                  </div>
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                    <Input
                      value={newSemesterName}
                      onChange={(event) => setNewSemesterName(event.target.value)}
                      placeholder="اسم الفصل الجديد"
                      className="border-[#d8e4fb] text-base"
                    />
                    <Input
                      type="date"
                      value={newSemesterStartDate}
                      onChange={(event) => setNewSemesterStartDate(event.target.value)}
                      className="border-[#d8e4fb] text-base"
                    />
                    <Button
                      type="button"
                      onClick={handleStartSemester}
                      disabled={isStartingSemester}
                      className="bg-[#3453a7] text-white hover:bg-[#24428f]"
                    >
                      {isStartingSemester ? "جاري البدء..." : "بدء الفصل"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[30px] border-[#dbe5f1] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
            <CardHeader className="text-right">
              <CardTitle className="text-2xl font-black text-[#1a2332]">أرشيف الفصول</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {semesters.map((semester) => (
                  <button
                    key={semester.id}
                    type="button"
                    onClick={() => setSelectedSemesterId(semester.id)}
                    className={`rounded-[24px] border px-4 py-4 text-right transition-all ${selectedSemesterId === semester.id ? "border-[#3453a7] bg-[#f5f8ff] shadow-sm" : "border-[#e5edf6] bg-white"}`}
                  >
                    <div className="text-lg font-black text-[#1a2332]">{semester.name}</div>
                    <div className="mt-3 space-y-1 text-sm font-semibold text-[#64748b]">
                      <div>البداية: {semester.start_date}</div>
                      <div>النهاية: {semester.end_date || "-"}</div>
                      <div>المدة: {formatSemesterDurationLabel(semester.start_date, semester.end_date || semester.start_date)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedSemester ? (
            <div className="grid gap-6 xl:grid-cols-3">
              <Card className="rounded-[30px] border-[#dde6f0] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)] xl:col-span-3">
                <CardHeader className="text-right">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <CardTitle className="text-xl font-black text-[#1a2332]">إحصائيات الفصل</CardTitle>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {selectedSemester.status === "archived" ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleDeleteSemester}
                          disabled={isDeletingSemester}
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          {isDeletingSemester ? "جاري الحذف..." : "حذف الفصل"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">الخطط</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{stats.plans_count}</div></div>
                    <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">الغيابات</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{stats.absences_count}</div></div>
                    <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">الحضور</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{stats.present_count + stats.late_count}</div></div>
                    <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">الصفحات المحفوظة</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{stats.memorized_pages}</div></div>
                    <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">صفحات المراجعة</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{stats.revised_pages}</div></div>
                    <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">صفحات الربط</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{stats.tied_pages}</div></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[30px] border-[#dde6f0] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)] xl:col-span-3">
                <SectionHeader title="بحث وتصفية" isOpen={isSearchOpen} onToggle={() => setIsSearchOpen((value) => !value)} />
                {isSearchOpen ? (
                  <CardContent>
                    <div className="grid gap-3 lg:grid-cols-3">
                      <Input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="ابحث باسم الطالب أو الحساب أو العنوان"
                        className="border-[#d8e4fb] text-base"
                      />
                      <select
                        value={selectedCircle}
                        onChange={(event) => setSelectedCircle(event.target.value)}
                        className="h-10 rounded-md border border-[#d8e4fb] bg-white px-3 text-sm text-[#1a2332]"
                      >
                        <option value="all">كل الحلقات</option>
                        {circleOptions.map((circle) => <option key={circle} value={circle}>{circle}</option>)}
                      </select>
                      <select
                        value={attendanceStatusFilter}
                        onChange={(event) => setAttendanceStatusFilter(event.target.value as AttendanceStatusFilter)}
                        className="h-10 rounded-md border border-[#d8e4fb] bg-white px-3 text-sm text-[#1a2332]"
                      >
                        <option value="all">كل حالات السجلات</option>
                        <option value="present">حاضر</option>
                        <option value="late">متأخر</option>
                        <option value="absent">غائب</option>
                        <option value="excused">مستأذن</option>
                        <option value="missing">بدون سجل</option>
                      </select>
                    </div>
                  </CardContent>
                ) : null}
              </Card>

              <Card className="rounded-[30px] border-[#dde6f0] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)] xl:col-span-3">
                <SectionHeader title="خطط الفصل" isOpen={isPlansOpen} onToggle={() => setIsPlansOpen((value) => !value)} />
                {isPlansOpen ? (
                  <CardContent>
                    <div className="overflow-hidden rounded-[24px] border border-[#ebeff5]">
                      <Table>
                        <TableHeader><TableRow><TableHead className="text-right">الطالب</TableHead><TableHead className="text-right">رقم الحساب</TableHead><TableHead className="text-right">النطاق</TableHead><TableHead className="text-right">بداية الخطة</TableHead><TableHead className="text-right">مقدار الحفظ اليومي</TableHead><TableHead className="text-right">المراجعة</TableHead><TableHead className="text-right">الربط</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {filteredPlans.length > 0 ? filteredPlans.map((plan) => {
                            const student = normalizeStudentRelation(plan.students)
                            return <TableRow key={plan.id}><TableCell className="text-right font-bold">{student?.name || "طالب"}</TableCell><TableCell className="text-right">{student?.account_number || "-"}</TableCell><TableCell className="text-right">{plan.start_surah_name || "-"} - {plan.end_surah_name || "-"}</TableCell><TableCell className="text-right">{plan.start_date || "-"}</TableCell><TableCell className="text-right">{plan.daily_pages || 0}</TableCell><TableCell className="text-right">{plan.muraajaa_pages || 0}</TableCell><TableCell className="text-right">{plan.rabt_pages || 0}</TableCell></TableRow>
                          }) : <TableRow><TableCell colSpan={7} className="py-8 text-center">لا توجد نتائج مطابقة في خطط الفصل</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                ) : null}
              </Card>

              <Card id="semester-daily-records" className="rounded-[30px] border-[#dde6f0] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)] xl:col-span-3">
                <SectionHeader title="سجلات الطلاب خلال الفصل" isOpen={isRecordsOpen} onToggle={() => setIsRecordsOpen((value) => !value)} />
                {isRecordsOpen ? (
                  <CardContent>
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="w-full md:w-[220px]">
                        <Input
                          type="date"
                          value={selectedAttendanceDate}
                          onChange={(event) => setSelectedAttendanceDate(event.target.value)}
                          className="border-[#d8e4fb] text-base"
                          min={selectedSemester.start_date}
                          max={selectedSemester.end_date || selectedSemester.start_date}
                        />
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-[24px] border border-[#ebeff5]">
                      <Table>
                        <TableHeader><TableRow><TableHead className="text-right">التاريخ</TableHead><TableHead className="text-right">الطالب</TableHead><TableHead className="text-right">رقم الحساب</TableHead><TableHead className="text-right">الحلقة</TableHead><TableHead className="text-right">الحالة</TableHead><TableHead className="text-right">الحفظ</TableHead><TableHead className="text-right">التكرار</TableHead><TableHead className="text-right">السماع</TableHead><TableHead className="text-right">الربط</TableHead><TableHead className="text-right">ملاحظات</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {isDailyRecordsLoading ? <TableRow><TableCell colSpan={10} className="py-8 text-center">جاري تحميل السجل اليومي...</TableCell></TableRow> : filteredDailyStudentRecords.length > 0 ? filteredDailyStudentRecords.map((record) => {
                            return <TableRow key={`${record.student_id}-${record.date}`}><TableCell className="text-right">{record.date || "-"}</TableCell><TableCell className="text-right font-bold">{record.student_name || "طالب"}</TableCell><TableCell className="text-right">{record.account_number || "-"}</TableCell><TableCell className="text-right">{record.halaqah || "-"}</TableCell><TableCell className="text-right">{translateAttendanceStatus(record.status) || "لا يوجد سجل"}</TableCell><TableCell className="text-right">{isNonEvaluatedAttendance(record.status) ? "-" : translateLevel(record.hafiz_level)}</TableCell><TableCell className="text-right">{isNonEvaluatedAttendance(record.status) ? "-" : translateLevel(record.tikrar_level)}</TableCell><TableCell className="text-right">{isNonEvaluatedAttendance(record.status) ? "-" : translateLevel(record.samaa_level)}</TableCell><TableCell className="text-right">{isNonEvaluatedAttendance(record.status) ? "-" : translateLevel(record.rabet_level)}</TableCell><TableCell className="text-right">{record.notes || (record.is_compensation ? "تعويض" : "-")}</TableCell></TableRow>
                          }) : <TableRow><TableCell colSpan={10} className="py-8 text-center">لا توجد نتائج مطابقة لهذا التاريخ</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                ) : null}
              </Card>

              <Card className="rounded-[30px] border-[#dde6f0] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)] xl:col-span-3">
                <SectionHeader title="الغيابات" isOpen={isAbsencesOpen} onToggle={() => setIsAbsencesOpen((value) => !value)} />
                {isAbsencesOpen ? (
                  <CardContent className="space-y-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="w-full md:w-[220px]">
                        <Input
                          type="date"
                          value={selectedAttendanceDate}
                          onChange={(event) => setSelectedAttendanceDate(event.target.value)}
                          className="border-[#d8e4fb] text-base"
                          min={selectedSemester.start_date}
                          max={selectedSemester.end_date || selectedSemester.start_date}
                        />
                      </div>
                    </div>
                    <div className="overflow-hidden rounded-[24px] border border-[#ebeff5]">
                      <Table>
                        <TableHeader><TableRow><TableHead className="text-right">الطالب</TableHead><TableHead className="text-right">رقم الحساب</TableHead><TableHead className="text-right">الحلقة</TableHead><TableHead className="text-right">عدد الغيابات</TableHead><TableHead className="text-right">آخر غياب</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {filteredAbsences.length > 0 ? filteredAbsences.map((absence) => {
                            return <TableRow key={absence.student_id} className="cursor-pointer" onClick={() => setSelectedAbsenceStudentId(absence.student_id)}><TableCell className="text-right font-bold">{absence.name}</TableCell><TableCell className="text-right">{absence.account_number || "-"}</TableCell><TableCell className="text-right">{absence.halaqah || "-"}</TableCell><TableCell className="text-right">{absence.absenceCount}</TableCell><TableCell className="text-right">{absence.lastAbsenceDate || "-"}</TableCell></TableRow>
                          }) : <TableRow><TableCell colSpan={5} className="py-8 text-center">لا توجد نتائج غياب مطابقة</TableCell></TableRow>}
                        </TableBody>
                      </Table>
                    </div>

                    {selectedAbsenceStudent ? (
                      <div className="rounded-[24px] border border-[#ebeff5] bg-[#fafcff] p-5">
                        <div className="mb-3 text-right">
                          <h3 className="text-lg font-black text-[#1a2332]">تفاصيل غيابات {selectedAbsenceStudent.name}</h3>
                          <p className="text-sm text-[#64748b]">اضغط على أي تاريخ لعرض جميع طلاب الفصل في ذلك اليوم.</p>
                        </div>
                        <div className="mb-4 flex flex-wrap justify-end gap-2">
                          {selectedAbsenceDates.length > 0 ? selectedAbsenceDates.map((absenceDate) => (
                            <Button
                              key={`${selectedAbsenceStudent.student_id}-${absenceDate}`}
                              type="button"
                              variant={selectedAttendanceDate === absenceDate ? "default" : "outline"}
                              onClick={() => handleSelectAbsenceDate(absenceDate)}
                              className={selectedAttendanceDate === absenceDate ? "bg-[#3453a7] text-white hover:bg-[#2d478f]" : ""}
                            >
                              {absenceDate}
                            </Button>
                          )) : null}
                        </div>
                        <div className="overflow-hidden rounded-[18px] border border-[#e5edf6] bg-white">
                          <Table>
                            <TableHeader><TableRow><TableHead className="text-right">تاريخ الغياب</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {selectedAbsenceDates.length > 0 ? selectedAbsenceDates.map((absenceDate) => <TableRow key={`${selectedAbsenceStudent.student_id}-${absenceDate}`}><TableCell className="text-right">{absenceDate}</TableCell></TableRow>) : <TableRow><TableCell className="py-8 text-center">لا توجد غيابات مسجلة لهذا الطالب في الفصل</TableCell></TableRow>}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                ) : null}
              </Card>

              <Card className="rounded-[30px] border-[#dde6f0] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)] xl:col-span-3">
                <SectionHeader title="المالية" isOpen={isFinanceOpen} onToggle={() => setIsFinanceOpen((value) => !value)} />
                {isFinanceOpen ? (
                  <CardContent className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">إجمالي الفواتير</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{formatAmount(stats.invoices_total)}</div></div>
                      <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">إجمالي المصروفات</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{formatAmount(stats.expenses_total)}</div></div>
                      <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">إجمالي الإيرادات</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{formatAmount(stats.incomes_total)}</div></div>
                      <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">تكاليف الرحلات</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{formatAmount(stats.trips_total)}</div></div>
                    </div>

                    <div className="overflow-hidden rounded-[24px] border border-[#ebeff5]">
                      <Table>
                        <TableHeader><TableRow><TableHead className="text-right">النوع</TableHead><TableHead className="text-right">العنوان</TableHead><TableHead className="text-right">الجهة</TableHead><TableHead className="text-right">المبلغ</TableHead><TableHead className="text-right">التاريخ</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {filteredFinanceRows.map((row) => <TableRow key={`${row.type}-${row.id}`}><TableCell className="text-right font-bold">{row.typeLabel}</TableCell><TableCell className="text-right">{row.title}</TableCell><TableCell className="text-right">{row.entity}</TableCell><TableCell className="text-right">{row.type === "trip" ? formatAmount(row.amount) : formatAmount(row.amount)}</TableCell><TableCell className="text-right">{row.date || "-"}</TableCell></TableRow>)}
                          {filteredFinanceRows.length === 0 ? <TableRow><TableCell colSpan={5} className="py-8 text-center">لا توجد نتائج مالية مطابقة</TableCell></TableRow> : null}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                ) : null}
              </Card>
            </div>
          ) : null}
        </div>
      </main>
      <Footer />
    </div>
  )
}