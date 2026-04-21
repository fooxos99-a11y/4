"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ComponentPropsWithoutRef } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SiteLoader } from "@/components/ui/site-loader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useConfirmDialog } from "@/hooks/use-confirm-dialog"
import { useToast } from "@/hooks/use-toast"
import { useWhatsAppStatus } from "@/hooks/use-whatsapp-status"
import { formatQuranRange, getJuzNumbersForPageRange, getPageForAyah, SURAHS } from "@/lib/quran-data"
import {
  DEFAULT_RECITATION_DAY_NOTIFICATION_TEMPLATES,
  normalizeRecitationDayNotificationTemplates,
  RECITATION_DAY_NOTIFICATION_SETTINGS_ID,
} from "@/lib/recitation-day-notification-templates"
import {
  DEFAULT_RECITATION_DAY_LIFECYCLE_NOTIFICATION_TEMPLATES,
  normalizeRecitationDayLifecycleNotificationTemplates,
  RECITATION_DAY_LIFECYCLE_NOTIFICATION_SETTINGS_ID,
  type RecitationDayLifecycleNotificationTemplates,
} from "@/lib/recitation-day-lifecycle-notification-templates"
import {
  calculateRecitationDayPortionGrade,
  DEFAULT_RECITATION_DAY_GRADING_SETTINGS_VALUE,
  normalizeRecitationDayGradingSettings,
  RECITATION_DAY_GRADING_SETTINGS_ID,
  type RecitationDayGradingSettings,
} from "@/lib/recitation-day-grading-settings"
import { Archive, CalendarDays, ChevronDown, CircleAlert, Eye, FileCheck2, PlayCircle, Trash2 } from "lucide-react"

type PortionRow = {
  id: string
  label: string
  portion_type: "juz" | "range"
  from_surah?: string | null
  from_verse?: string | null
  to_surah?: string | null
  to_verse?: string | null
  status: string
  evaluator_name?: string | null
  heard_amount_text?: string | null
  grade?: number | null
  errors_count: number
  alerts_count: number
  notes?: string | null
}

type StudentRow = {
  id: string
  student_name: string
  halaqah?: string | null
  teacher_name?: string | null
  full_memorized_text: string
  scattered_parts_text?: string | null
  overall_status: string
  evaluator_name?: string | null
  heard_amount_text?: string | null
  grade?: number | null
  errors_count: number
  alerts_count: number
  notes?: string | null
  portions: PortionRow[]
}

type DayRow = {
  id: string
  recitation_date: string
  recitation_end_date?: string | null
  status: string
}

type ArchiveDayRow = {
  id: string
  recitation_date: string
  recitation_end_date?: string | null
  halaqah?: string | null
}

type NotificationTemplatesForm = {
  app: string
  whatsapp: string
}

type LifecycleTemplateKey = "start" | "end"

const STATUS_OPTIONS = [
  { value: "not_listened", label: "لم يُسمّع" },
  { value: "partial", label: "سُمّع جزئيًا" },
  { value: "completed", label: "سُمّع كامل المحفوظ" },
  { value: "repeat", label: "يحتاج إعادة" },
  { value: "postponed", label: "مؤجل" },
]

function getStatusLabel(status?: string | null) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label || "لم يُسمّع"
}

function getTodayValue() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date())
}

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

function StyledSelect({ className = "", children, ...props }: ComponentPropsWithoutRef<"select">) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`h-10 w-full appearance-none rounded-full border border-[#d8e4fb] bg-white px-4 pe-10 text-sm text-[#1a2332] outline-none transition focus:border-[#3453a7] ${className}`.trim()}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3453a7]" />
    </div>
  )
}

function getLifecycleScopeLabel(targetHalaqah: string, allLabel: string, halaqahPrefix: string) {
  return targetHalaqah === "all" ? allLabel : `${halaqahPrefix} ${targetHalaqah}`
}

function getSurahNumberByName(name?: string | null) {
  if (!name) {
    return null
  }

  return SURAHS.find((surah) => surah.name === name)?.number ?? null
}

function getPortionJuzTitle(portion: PortionRow) {
  const fromSurahNumber = getSurahNumberByName(portion.from_surah)
  const toSurahNumber = getSurahNumberByName(portion.to_surah)
  const fromVerse = Number(portion.from_verse || 1)
  const toVerse = Number(portion.to_verse || 1)

  if (!fromSurahNumber || !toSurahNumber) {
    return portion.label
  }

  const juzNumbers = getJuzNumbersForPageRange(
    getPageForAyah(fromSurahNumber, fromVerse),
    getPageForAyah(toSurahNumber, toVerse) + 0.0001,
  )

  if (juzNumbers.length === 1) {
    return `الجزء ${juzNumbers[0]}`
  }

  return portion.label
}

function getPortionRangeText(portion: PortionRow) {
  const fromSurah = portion.from_surah
  const fromVerse = portion.from_verse
  const toSurah = portion.to_surah
  const toVerse = portion.to_verse

  if (!fromSurah || !fromVerse || !toSurah || !toVerse) {
    return portion.label
  }

  return formatQuranRange(fromSurah, String(fromVerse), toSurah, String(toVerse)) || `${fromSurah} ${fromVerse} إلى ${toSurah} ${toVerse}`
}

function getAutomaticStatusLabel(status?: string | null) {
  if (status === "completed") {
    return "تم اعتماد الجزء"
  }

  if (status === "partial") {
    return "تم الحفظ"
  }

  return "لم يسمع"
}

function getStudentAggregate(portions: PortionRow[]) {
  const portionCount = portions.length
  const totalGrade = portions.reduce((sum, portion) => sum + (Number(portion.grade) || 0), 0)
  const grade = portionCount > 0 ? Number((totalGrade / portionCount).toFixed(2)) : null
  const errors = portions.reduce((sum, portion) => sum + Math.max(0, Number(portion.errors_count || 0)), 0)
  const alerts = portions.reduce((sum, portion) => sum + Math.max(0, Number(portion.alerts_count || 0)), 0)

  return { grade, errors, alerts }
}

function getIncompleteEvaluationMessage(student: StudentRow, gradingSettings: RecitationDayGradingSettings) {
  if (!String(student.evaluator_name || "").trim()) {
    return "أدخل اسم المقيّم قبل حفظ التقييم النهائي"
  }

  if (student.portions.length === 0) {
    return "لا توجد أجزاء مضافة لهذا الطالب"
  }

  const hasMissingGrade = student.portions.some((portion) => portion.grade === null || portion.grade === undefined || Number.isNaN(Number(portion.grade)))
  if (hasMissingGrade) {
    return "تعذر احتساب درجة أحد الأجزاء. تحقق من الأخطاء والتنبيهات ثم أعد المحاولة"
  }

  return null
}

const tableHeadClassName = "h-12 whitespace-nowrap align-middle text-right text-sm font-bold text-[#1a2332]"

export default function AdminRecitationDayPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("يوم السرد")
  const { isReady: isWhatsAppReady, isLoading: isWhatsAppStatusLoading } = useWhatsAppStatus()
  const confirmDialog = useConfirmDialog()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [recitationStartDate, setRecitationStartDate] = useState(getTodayValue())
  const [recitationEndDate, setRecitationEndDate] = useState(getTodayValue())
  const [startTargetHalaqah, setStartTargetHalaqah] = useState("all")
  const [selectedHalaqah, setSelectedHalaqah] = useState("all")
  const [currentDay, setCurrentDay] = useState<DayRow | null>(null)
  const [students, setStudents] = useState<StudentRow[]>([])
  const [halaqahOptions, setHalaqahOptions] = useState<string[]>([])
  const [startHalaqahOptions, setStartHalaqahOptions] = useState<string[]>([])
  const [archiveDays, setArchiveDays] = useState<ArchiveDayRow[]>([])
  const [isArchiveLoading, setIsArchiveLoading] = useState(false)
  const [selectedArchiveDayId, setSelectedArchiveDayId] = useState("")
  const [selectedArchiveDate, setSelectedArchiveDate] = useState("")
  const [archiveStudents, setArchiveStudents] = useState<StudentRow[]>([])
  const [archiveHalaqahOptions, setArchiveHalaqahOptions] = useState<string[]>([])
  const [selectedArchiveHalaqah, setSelectedArchiveHalaqah] = useState("all")
  const [endTargetHalaqah, setEndTargetHalaqah] = useState("all")
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null)
  const [detailsStudent, setDetailsStudent] = useState<StudentRow | null>(null)
  const [archiveDetailsStudent, setArchiveDetailsStudent] = useState<StudentRow | null>(null)
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false)
  const [isSavingStudent, setIsSavingStudent] = useState(false)
  const [savingPortionId, setSavingPortionId] = useState<string | null>(null)
  const [deletingArchiveId, setDeletingArchiveId] = useState<string | null>(null)
  const [notificationTemplatesForm, setNotificationTemplatesForm] = useState<NotificationTemplatesForm>(DEFAULT_RECITATION_DAY_NOTIFICATION_TEMPLATES)
  const [lifecycleTemplatesForm, setLifecycleTemplatesForm] = useState<RecitationDayLifecycleNotificationTemplates>(
    DEFAULT_RECITATION_DAY_LIFECYCLE_NOTIFICATION_TEMPLATES,
  )
  const [gradingSettingsForm, setGradingSettingsForm] = useState<RecitationDayGradingSettings>(DEFAULT_RECITATION_DAY_GRADING_SETTINGS_VALUE)
  const [isSavingTemplates, setIsSavingTemplates] = useState(false)
  const [isSavingLifecycleTemplates, setIsSavingLifecycleTemplates] = useState(false)
  const [isSavingGradingSettings, setIsSavingGradingSettings] = useState(false)
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false)
  const [isGradingSettingsDialogOpen, setIsGradingSettingsDialogOpen] = useState(false)

  async function loadNotificationTemplates() {
    try {
      const response = await fetch(`/api/site-settings?id=${RECITATION_DAY_NOTIFICATION_SETTINGS_ID}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب قوالب التنبيه")
      }

      setNotificationTemplatesForm(normalizeRecitationDayNotificationTemplates(data.value))
    } catch (error) {
      toast({ title: "تعذر جلب القوالب", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    }
  }

  async function loadLifecycleNotificationTemplates() {
    try {
      const response = await fetch(`/api/site-settings?id=${RECITATION_DAY_LIFECYCLE_NOTIFICATION_SETTINGS_ID}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب قوالب تنبيهات البدء والإنهاء")
      }

      setLifecycleTemplatesForm(normalizeRecitationDayLifecycleNotificationTemplates(data.value))
    } catch (error) {
      toast({
        title: "تعذر جلب قوالب البدء والإنهاء",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      })
    }
  }

  async function loadGradingSettings() {
    try {
      const response = await fetch(`/api/site-settings?id=${RECITATION_DAY_GRADING_SETTINGS_ID}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب إعدادات التقييم")
      }

      setGradingSettingsForm(normalizeRecitationDayGradingSettings(data.value))
    } catch (error) {
      toast({ title: "تعذر جلب إعدادات التقييم", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    }
  }

  function calculatePortionGrade(errorsCount: number, alertsCount: number) {
    return calculateRecitationDayPortionGrade({
      errorsCount,
      alertsCount,
      settings: gradingSettingsForm,
    })
  }

  function syncPortionWithGradingSettings(portion: PortionRow, nextValues?: Partial<PortionRow>): PortionRow {
    const mergedPortion = { ...portion, ...nextValues }

    return {
      ...mergedPortion,
      grade: calculatePortionGrade(Number(mergedPortion.errors_count || 0), Number(mergedPortion.alerts_count || 0)),
    }
  }

  function syncStudentWithGradingSettings(student: StudentRow) {
    return {
      ...student,
      portions: student.portions.map((portion) => syncPortionWithGradingSettings(portion)),
    }
  }

  async function loadCurrentDay() {
    setIsLoading(true)
    try {
      const response = await fetch("/api/recitation-days", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب يوم السرد")
      }

      setCurrentDay(data.currentDay || null)
      setStudents(data.students || [])
      setHalaqahOptions(data.halaqahOptions || [])
      setEndTargetHalaqah("all")
    } catch (error) {
      toast({ title: "تعذر تحميل البيانات", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function loadStartHalaqahOptions() {
    try {
      const [circlesResponse, studentsResponse] = await Promise.all([
        fetch("/api/circles", { cache: "no-store" }),
        fetch("/api/students", { cache: "no-store" }),
      ])

      const circlesData = await circlesResponse.json()
      const studentsData = await studentsResponse.json()

      if (!circlesResponse.ok) {
        throw new Error(circlesData.error || "تعذر جلب الحلقات")
      }

      if (!studentsResponse.ok) {
        throw new Error(studentsData.error || "تعذر جلب الطلاب")
      }

      const options = Array.from<string>(
        new Set([
          ...(circlesData.circles || []).map((circle: { name?: string | null }) => String(circle?.name || "").trim()),
          ...(studentsData.students || []).map((student: { halaqah?: string | null; circle_name?: string | null }) => String(student?.halaqah || student?.circle_name || "").trim()),
        ].filter(Boolean)),
      ).sort((first, second) => first.localeCompare(second, "ar"))

      setStartHalaqahOptions(options)
    } catch (error) {
      console.error("[recitation-day] Failed to load halaqah options:", error)
      setStartHalaqahOptions([])
    }
  }

  useEffect(() => {
    if (authLoading || !authVerified) {
      return
    }

    void loadCurrentDay()
    void loadArchiveDays()
    void loadStartHalaqahOptions()
    void loadNotificationTemplates()
    void loadLifecycleNotificationTemplates()
    void loadGradingSettings()
  }, [authLoading, authVerified])

  useEffect(() => {
    setEditingStudent((current) => current ? syncStudentWithGradingSettings(current) : current)
  }, [gradingSettingsForm])

  const filteredStudents = useMemo(() => {
    if (selectedHalaqah === "all") {
      return students
    }

    return students.filter((student) => (student.halaqah || "") === selectedHalaqah)
  }, [selectedHalaqah, students])

  const listenedCount = useMemo(() => students.filter((student) => student.overall_status !== "not_listened").length, [students])

  const filteredArchiveStudents = useMemo(() => {
    if (selectedArchiveHalaqah === "all") {
      return archiveStudents
    }

    return archiveStudents.filter((student) => (student.halaqah || "") === selectedArchiveHalaqah)
  }, [archiveStudents, selectedArchiveHalaqah])

  async function loadArchiveDayDetails(dayId: string) {
    setIsArchiveLoading(true)
    try {
      const response = await fetch(`/api/recitation-days/${dayId}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب تفاصيل الأرشيف")
      }

      setSelectedArchiveDayId(dayId)
      setSelectedArchiveDate(getRecitationDateRangeLabel(data.day?.recitation_date, data.day?.recitation_end_date))
      setArchiveStudents(data.students || [])
      setArchiveHalaqahOptions(data.halaqahOptions || [])
      setSelectedArchiveHalaqah("all")
    } catch (error) {
      toast({ title: "تعذر جلب تفاصيل الأرشيف", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setIsArchiveLoading(false)
    }
  }

  async function loadArchiveDays() {
    try {
      const response = await fetch("/api/recitation-days?mode=archive", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر جلب أرشيف السرد")
      }

      setArchiveDays(data.archiveDays || [])
      if (data.archiveDays?.[0]?.id) {
        void loadArchiveDayDetails(data.archiveDays[0].id)
      } else {
        setSelectedArchiveDayId("")
        setSelectedArchiveDate("")
        setArchiveStudents([])
        setArchiveHalaqahOptions([])
      }
    } catch (error) {
      toast({ title: "تعذر جلب أرشيف السرد", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    }
  }

  async function deleteArchiveDay(day: ArchiveDayRow) {
    const confirmed = await confirmDialog({
      title: "حذف الأرشيف",
      description: `سيتم حذف أرشيف يوم السرد بتاريخ ${getRecitationDateRangeLabel(day.recitation_date, day.recitation_end_date)} نهائيًا. هل تريد المتابعة؟`,
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

      if (selectedArchiveDayId === day.id) {
        setSelectedArchiveDayId("")
        setSelectedArchiveDate("")
        setArchiveStudents([])
        setArchiveHalaqahOptions([])
        setSelectedArchiveHalaqah("all")
      }

      await loadArchiveDays()
      toast({ title: "تم حذف الأرشيف", description: `تم حذف أرشيف ${getRecitationDateRangeLabel(day.recitation_date, day.recitation_end_date)}` })
    } catch (error) {
      toast({ title: "تعذر حذف الأرشيف", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setDeletingArchiveId(null)
    }
  }

  async function handleStartDay() {
    if (!recitationStartDate || !recitationEndDate) {
      toast({ title: "البيانات غير مكتملة", description: "حدد تاريخ البداية والنهاية أولاً", variant: "destructive" })
      return
    }

    if (recitationEndDate < recitationStartDate) {
      toast({ title: "نطاق غير صالح", description: "تاريخ النهاية يجب أن يكون مساويًا أو بعد تاريخ البداية", variant: "destructive" })
      return
    }

    const templatesSaved = await saveLifecycleNotificationTemplates()
    if (!templatesSaved) {
      return
    }

    setIsStarting(true)
    try {
      const response = await fetch("/api/recitation-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recitationStartDate,
          recitationEndDate,
          halaqah: startTargetHalaqah === "all" ? null : startTargetHalaqah,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر بدء يوم السرد")
      }

      setCurrentDay(data.currentDay || null)
      setStudents(data.students || [])
      setHalaqahOptions(data.halaqahOptions || [])
      setStartTargetHalaqah("all")
      setIsStartDialogOpen(false)
      await loadArchiveDays()
      toast({ title: "تم بدء يوم السرد", description: `تم إنشاء يوم سرد ${getRecitationDateRangeLabel(recitationStartDate, recitationEndDate)}` })
    } catch (error) {
      toast({ title: "تعذر بدء يوم السرد", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setIsStarting(false)
    }
  }

  async function handleArchiveDay() {
    if (!currentDay) return

    setIsArchiving(true)
    try {
      const payload = {
        halaqah: endTargetHalaqah === "all" ? null : endTargetHalaqah,
      }
      const response = await fetch("/api/recitation-days", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر إنهاء يوم السرد")
      }

      setIsArchiveConfirmOpen(false)
      setSelectedHalaqah("all")
      setEndTargetHalaqah("all")
      await loadCurrentDay()
      await loadArchiveDays()
      toast({ title: "تم إنهاء يوم السرد", description: "تمت إضافة اليوم الحالي إلى أرشيف السرد داخل الصفحة" })
    } catch (error) {
      toast({ title: "تعذر إنهاء يوم السرد", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setIsArchiving(false)
    }
  }

  function updateStudentInState(updatedStudent: StudentRow) {
    setStudents((current) => current.map((student) => student.id === updatedStudent.id ? { ...student, ...updatedStudent, portions: updatedStudent.portions || student.portions } : student))
    setEditingStudent((current) => current && current.id === updatedStudent.id ? { ...current, ...updatedStudent } : current)
    setDetailsStudent((current) => current && current.id === updatedStudent.id ? { ...current, ...updatedStudent, portions: updatedStudent.portions || current.portions } : current)
  }

  async function saveStudentEvaluation() {
    if (!editingStudent) return

    const incompleteMessage = getIncompleteEvaluationMessage(editingStudent, gradingSettingsForm)
    if (incompleteMessage) {
      toast({ title: "البيانات غير مكتملة", description: incompleteMessage, variant: "destructive" })
      return
    }

    setIsSavingStudent(true)
    try {
      const response = await fetch(`/api/recitation-day-students/${editingStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingStudent),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ تقييم الطالب")
      }

      updateStudentInState({ ...editingStudent, ...data.student })
      setEditingStudent(null)
      toast({ title: "تم حفظ التقييم", description: `تم تحديث تقييم ${editingStudent.student_name}` })
    } catch (error) {
      toast({ title: "تعذر حفظ التقييم", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setIsSavingStudent(false)
    }
  }

  async function savePortion(portion: PortionRow) {
    setSavingPortionId(portion.id)
    try {
      const response = await fetch(`/api/recitation-day-portions/${portion.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(portion),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "تعذر حفظ تقييم الجزء")
      }

      setStudents((current) => current.map((student) => ({
        ...student,
        portions: student.portions.map((item) => item.id === portion.id ? { ...item, ...data.portion } : item),
      })))

      setEditingStudent((current) => current ? {
        ...current,
        portions: current.portions.map((item) => item.id === portion.id ? { ...item, ...data.portion } : item),
      } : current)

      setDetailsStudent((current) => current ? {
        ...current,
        portions: current.portions.map((item) => item.id === portion.id ? { ...item, ...data.portion } : item),
      } : current)

      toast({ title: "تم حفظ المسودة", description: `تم حفظ ${portion.label} كبيانات مؤقتة` })
    } catch (error) {
      toast({ title: "تعذر حفظ تقييم الجزء", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setSavingPortionId(null)
    }
  }

  async function saveNotificationTemplates() {
    try {
      setIsSavingTemplates(true)
      const response = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: RECITATION_DAY_NOTIFICATION_SETTINGS_ID,
          value: notificationTemplatesForm,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ قوالب التنبيه")
      }

      setNotificationTemplatesForm(normalizeRecitationDayNotificationTemplates(notificationTemplatesForm))
      toast({ title: "تم حفظ القوالب", description: "سيتم استخدام القوالب عند حفظ التقييم النهائي" })
    } catch (error) {
      toast({ title: "تعذر حفظ القوالب", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setIsSavingTemplates(false)
    }
  }

  async function saveLifecycleNotificationTemplates() {
    try {
      setIsSavingLifecycleTemplates(true)
      const response = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: RECITATION_DAY_LIFECYCLE_NOTIFICATION_SETTINGS_ID,
          value: lifecycleTemplatesForm,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ قوالب البدء والإنهاء")
      }

      setLifecycleTemplatesForm(normalizeRecitationDayLifecycleNotificationTemplates(lifecycleTemplatesForm))
      return true
    } catch (error) {
      toast({
        title: "تعذر حفظ قوالب البدء والإنهاء",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      })
      return false
    } finally {
      setIsSavingLifecycleTemplates(false)
    }
  }

  async function saveGradingSettings() {
    try {
      setIsSavingGradingSettings(true)
      const normalizedSettings = normalizeRecitationDayGradingSettings(gradingSettingsForm)
      const response = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: RECITATION_DAY_GRADING_SETTINGS_ID,
          value: normalizedSettings,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ إعدادات التقييم")
      }

      setGradingSettingsForm(normalizedSettings)
      setIsGradingSettingsDialogOpen(false)
      toast({ title: "تم حفظ إعدادات التقييم", description: "سيتم احتساب الدرجات الجديدة في يوم السرد وفق الإعدادات المحددة" })
    } catch (error) {
      toast({ title: "تعذر حفظ إعدادات التقييم", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
    } finally {
      setIsSavingGradingSettings(false)
    }
  }

  async function saveMessageTemplates() {
    const lifecycleSaved = await saveLifecycleNotificationTemplates()
    if (!lifecycleSaved) {
      return false
    }

    try {
      setIsSavingTemplates(true)
      const response = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: RECITATION_DAY_NOTIFICATION_SETTINGS_ID,
          value: notificationTemplatesForm,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ قوالب التقييم النهائي")
      }

      setNotificationTemplatesForm(normalizeRecitationDayNotificationTemplates(notificationTemplatesForm))
      toast({ title: "تم حفظ القوالب", description: "سيتم استخدام القوالب عند بدء يوم السرد وحفظ التقييم النهائي" })
      return true
    } catch (error) {
      toast({ title: "تعذر حفظ القوالب", description: error instanceof Error ? error.message : "حدث خطأ غير متوقع", variant: "destructive" })
      return false
    } finally {
      setIsSavingTemplates(false)
    }
  }

  function renderLifecycleTemplateFields(templateKey: LifecycleTemplateKey) {
    const title = templateKey === "start" ? "رسائل بدء يوم السرد" : "رسائل إنهاء يوم السرد"

    return (
      <div className="space-y-4 rounded-[24px] border border-[#e6edf6] bg-[#fbfdff] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 text-right">
          <div>
            <div className="text-base font-black text-[#1a2332] sm:text-lg">{title}</div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#3453a7] transition-colors hover:text-[#28448e]" aria-label="المتغيرات المتاحة في قوالب البدء والإنهاء">
                <CircleAlert className="h-4 w-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent hideArrow side="left" sideOffset={8} className="max-w-sm rounded-xl bg-[#1a2332] px-4 py-3 text-right text-xs leading-6 text-white">
              المتغيرات المتاحة: <span className="font-bold">{'{name}'}</span> اسم الطالب، <span className="font-bold">{'{halaqah}'}</span> اسم الحلقة، <span className="font-bold">{'{date}'}</span> التاريخ.
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 text-right">
            <div className="text-sm font-bold text-[#1a2332]">تنبيه الطالب داخل المنصة</div>
            <textarea
              value={lifecycleTemplatesForm[templateKey].app}
              onChange={(event) =>
                setLifecycleTemplatesForm((current) => ({
                  ...current,
                  [templateKey]: { ...current[templateKey], app: event.target.value },
                }))
              }
              className="min-h-[132px] w-full rounded-[22px] border border-[#d8e4fb] px-4 py-3 text-sm outline-none transition focus:border-[#3453a7]"
            />
          </div>
          <div className="space-y-2 text-right">
            <div className="text-sm font-bold text-[#1a2332]">رسالة ولي الأمر عبر الواتساب</div>
            <textarea
              value={lifecycleTemplatesForm[templateKey].whatsapp}
              onChange={(event) =>
                setLifecycleTemplatesForm((current) => ({
                  ...current,
                  [templateKey]: { ...current[templateKey], whatsapp: event.target.value },
                }))
              }
              className="min-h-[132px] w-full rounded-[22px] border border-[#d8e4fb] px-4 py-3 text-sm outline-none transition focus:border-[#3453a7]"
            />
          </div>
        </div>

      </div>
    )
  }

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
        {!isWhatsAppStatusLoading && !isWhatsAppReady ? (
          <div className="text-right text-sm font-black leading-7 text-[#b91c1c]">
            واتس اب غير مربوط حاليا، إربطه بالباركود لتتمكن من الإرسال الى اولياء الأمور.
          </div>
        ) : null}

        <Card className="rounded-[30px] border-[#dde6f0] bg-white shadow-[0_16px_45px_rgba(15,23,42,0.06)]">
          <CardHeader className="text-right">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex w-full items-center justify-start gap-2 text-2xl font-black text-[#1a2332]"><CalendarDays className="h-6 w-6 text-[#3453a7]" /><span>يوم السرد</span></CardTitle>
              <Button type="button" variant="outline" onClick={() => setIsTemplatesDialogOpen(true)} className="h-11 rounded-full border-[#d8e4fb] px-6 text-[#3453a7] hover:bg-[#f5f8ff] sm:w-auto">
                قوالب الرسائل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!currentDay ? (
              <div className="flex flex-col items-start justify-between gap-4 rounded-[24px] border border-[#e8eef7] bg-[#fafcff] p-4 sm:flex-row sm:items-center">
                <div className="space-y-1 text-right">
                  <div className="text-base font-black text-[#1a2332]">لا يوجد يوم سرد مفتوح</div>
                  <div className="text-sm text-[#64748b]">حدد التاريخ من نافذة البدء ثم أنشئ يوم سرد جديد.</div>
                </div>
                <Button onClick={() => setIsStartDialogOpen(true)} className="h-11 w-full rounded-full bg-[#3453a7] px-6 text-white hover:bg-[#28448e] sm:w-auto"><PlayCircle className="me-2 h-4 w-4" />بدء يوم السرد</Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <StyledSelect value={selectedHalaqah} onChange={(event) => setSelectedHalaqah(event.target.value)}>
                    <option value="all">كل الحلقات</option>
                    {halaqahOptions.map((halaqah) => <option key={halaqah} value={halaqah}>{halaqah}</option>)}
                  </StyledSelect>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsGradingSettingsDialogOpen(true)} className="h-11 rounded-full border-[#d8e4fb] px-6 text-[#3453a7] hover:bg-[#f5f8ff]">
                      إعدادات التقييم
                    </Button>
                    <Button onClick={() => setIsArchiveConfirmOpen(true)} disabled={isArchiving} className="h-11 rounded-full bg-[#0f766e] px-6 text-white hover:bg-[#115e59]"><FileCheck2 className="me-2 h-4 w-4" />{isArchiving ? "جاري الإنهاء..." : "إنهاء يوم السرد"}</Button>
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">تاريخ السرد</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{getRecitationDateRangeLabel(currentDay.recitation_date, currentDay.recitation_end_date)}</div></div>
                  <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">عدد الطلاب</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{students.length}</div></div>
                  <div className="rounded-[22px] border border-[#e8eef7] bg-[#fafcff] px-4 py-4 text-right"><div className="text-xs text-[#64748b]">الطلاب المنتهين</div><div className="mt-2 text-2xl font-black text-[#1a2332]">{listenedCount}</div></div>
                </div>
                <div className="overflow-hidden rounded-[24px] border border-[#ebeff5] bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className={tableHeadClassName}>الطالب</TableHead>
                        <TableHead className={tableHeadClassName}>الحلقة</TableHead>
                        <TableHead className={tableHeadClassName}>حالة السرد</TableHead>
                        <TableHead className={tableHeadClassName}>اسم المعلم</TableHead>
                        <TableHead className={tableHeadClassName}>المقيّم</TableHead>
                        <TableHead className={tableHeadClassName}>ملاحظات المقيّم</TableHead>
                        <TableHead className={tableHeadClassName}>المسمّع</TableHead>
                        <TableHead className="h-12 w-14 whitespace-nowrap align-middle text-center text-sm font-bold text-[#1a2332]"></TableHead>
                        <TableHead className="h-12 w-14 whitespace-nowrap align-middle text-center text-sm font-bold text-[#1a2332]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="text-right font-bold">{student.student_name}</TableCell>
                          <TableCell className="text-right">{student.halaqah || "-"}</TableCell>
                          <TableCell className="text-right">{getStatusLabel(student.overall_status)}</TableCell>
                          <TableCell className="text-right">{student.teacher_name || "-"}</TableCell>
                          <TableCell className="text-right">{student.evaluator_name || "-"}</TableCell>
                          <TableCell className="max-w-[240px] text-right">{student.notes || "-"}</TableCell>
                          <TableCell className="max-w-[220px] text-right">{student.heard_amount_text || "-"}</TableCell>
                          <TableCell className="text-center"><Button type="button" variant="outline" className="rounded-full px-4" onClick={() => setEditingStudent(student)}>التقييم</Button></TableCell>
                          <TableCell className="text-center"><Button type="button" variant="ghost" className="rounded-full px-4 text-[#3453a7]" onClick={() => setDetailsStudent(student)}>التفاصيل</Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-start border-t border-[#e8eef6] pt-6">
              <Link href="/admin/recitation-day/archive" className="inline-flex h-11 items-center justify-center rounded-full bg-[#3453a7] px-6 text-sm font-black text-white transition hover:bg-[#28448e]">
                الأرشيف
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />

      <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
        <DialogContent className="max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-xl overflow-y-auto rounded-[28px] border border-[#dbe5f1] p-0 shadow-[0_24px_70px_rgba(15,23,42,0.14)]" dir="rtl" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader className="border-b border-[#e8eef6] px-4 py-4 text-right sm:px-6">
            <DialogDescription className="sr-only">نافذة بدء يوم السرد وتحديد التاريخ ونطاق الطلاب.</DialogDescription>
            <DialogTitle className="text-right text-lg font-black text-[#1a2332] sm:text-xl">بدء يوم السرد</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-4 py-5 text-right sm:px-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-bold text-[#1a2332]">من</div>
                <Input type="date" value={recitationStartDate} onChange={(event) => setRecitationStartDate(event.target.value)} className="border-[#d8e4fb]" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-[#1a2332]">إلى</div>
                <Input type="date" value={recitationEndDate} min={recitationStartDate || undefined} onChange={(event) => setRecitationEndDate(event.target.value)} className="border-[#d8e4fb]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-bold text-[#1a2332]">نطاق الطلاب</div>
              <StyledSelect value={startTargetHalaqah} onChange={(event) => setStartTargetHalaqah(event.target.value)}>
                <option value="all">جميع الطلاب</option>
                {startHalaqahOptions.map((halaqah) => <option key={halaqah} value={halaqah}>{halaqah}</option>)}
              </StyledSelect>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
              <Button type="button" variant="outline" onClick={() => setIsStartDialogOpen(false)} className="h-11 rounded-full border-[#d8e4fb] px-6">
                إلغاء
              </Button>
              <Button type="button" onClick={handleStartDay} disabled={isStarting || isSavingLifecycleTemplates || !recitationStartDate || !recitationEndDate} className="h-11 rounded-full bg-[#3453a7] px-6 text-white hover:bg-[#28448e]">
                {isStarting ? "جاري البدء..." : isSavingLifecycleTemplates ? "جاري الإرسال" : getLifecycleScopeLabel(startTargetHalaqah, "تأكيد البدء", "تأكيد البدء")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isArchiveConfirmOpen} onOpenChange={setIsArchiveConfirmOpen}>
        <DialogContent className="max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-xl overflow-y-auto rounded-[28px] border border-[#dbe5f1] p-0 shadow-[0_24px_70px_rgba(15,23,42,0.14)]" dir="rtl" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader className="border-b border-[#e8eef6] px-4 py-4 text-right sm:px-6">
            <DialogDescription className="sr-only">نافذة تأكيد إنهاء يوم السرد وتحديد نطاق الحلقات.</DialogDescription>
            <DialogTitle className="text-right text-lg font-black text-[#1a2332] sm:text-xl">إنهاء يوم السرد</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-4 py-5 text-right sm:px-6">
            <div className="space-y-2">
              <div className="text-sm font-bold text-[#1a2332]">نطاق الحلقات</div>
              <StyledSelect value={endTargetHalaqah} onChange={(event) => setEndTargetHalaqah(event.target.value)}>
                <option value="all">جميع الحلقات</option>
                {halaqahOptions.map((halaqah) => <option key={halaqah} value={halaqah}>{halaqah}</option>)}
              </StyledSelect>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
              <Button type="button" variant="outline" onClick={() => setIsArchiveConfirmOpen(false)} className="h-11 rounded-full border-[#d8e4fb] px-6">
                إلغاء
              </Button>
              <Button type="button" onClick={handleArchiveDay} disabled={isArchiving} className="h-11 rounded-full bg-[#0f766e] px-6 text-white hover:bg-[#115e59]">
                <FileCheck2 className="me-2 h-4 w-4" />
                {isArchiving ? "جاري الإنهاء..." : "تأكيد الإنهاء"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isTemplatesDialogOpen} onOpenChange={setIsTemplatesDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto" dir="rtl" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogDescription className="sr-only">نافذة قوالب بدء يوم السرد والتقييم النهائي داخل المنصة وعبر واتساب.</DialogDescription>
            <div className="relative text-right">
              <DialogTitle className="text-right text-xl font-black">قوالب رسائل يوم السرد</DialogTitle>
              <div className="absolute left-0 top-0 flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[#3453a7] transition-colors hover:text-[#28448e]" aria-label="المتغيرات المتاحة في قوالب يوم السرد">
                      <CircleAlert className="h-4 w-4" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent hideArrow side="left" sideOffset={8} className="max-w-sm rounded-xl bg-[#1a2332] px-4 py-3 text-right text-xs leading-6 text-white">
                    في قالب بدء يوم السرد: <span className="font-bold">{'{name}'}</span> اسم الطالب، <span className="font-bold">{'{halaqah}'}</span> اسم الحلقة، <span className="font-bold">{'{date}'}</span> التاريخ. وفي قالب التقييم النهائي تضاف أيضًا: <span className="font-bold">{'{evaluator}'}</span> اسم المقيّم، <span className="font-bold">{'{grade}'}</span> الدرجة، <span className="font-bold">{'{errors}'}</span> الأخطاء، <span className="font-bold">{'{alerts}'}</span> التنبيهات.
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 text-right">
            {renderLifecycleTemplateFields("start")}

            <div className="space-y-2 pt-2">
              <div className="text-base font-black text-[#1a2332] sm:text-lg">رسائل التقييم النهائي</div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-bold text-[#1a2332]">تنبيه الطالب داخل المنصة</div>
                <textarea
                  value={notificationTemplatesForm.app}
                  onChange={(event) => setNotificationTemplatesForm((current) => ({ ...current, app: event.target.value }))}
                  className="min-h-[160px] w-full rounded-[22px] border border-[#d8e4fb] px-4 py-3 text-sm outline-none"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-[#1a2332]">رسالة ولي الأمر عبر الواتساب</div>
                <textarea
                  value={notificationTemplatesForm.whatsapp}
                  onChange={(event) => setNotificationTemplatesForm((current) => ({ ...current, whatsapp: event.target.value }))}
                  className="min-h-[160px] w-full rounded-[22px] border border-[#d8e4fb] px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex justify-start gap-2">
              <Button type="button" variant="outline" onClick={() => setIsTemplatesDialogOpen(false)} className="h-11 rounded-full border-[#d8e4fb] px-6">
                إغلاق
              </Button>
              <Button type="button" onClick={async () => {
                const saved = await saveMessageTemplates()
                if (saved) {
                  setIsTemplatesDialogOpen(false)
                }
              }} disabled={isSavingTemplates || isSavingLifecycleTemplates} className="h-11 rounded-full bg-[#3453a7] px-6 text-white hover:bg-[#28448e]">
                {isSavingTemplates || isSavingLifecycleTemplates ? "جاري الحفظ..." : "حفظ القوالب"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isGradingSettingsDialogOpen} onOpenChange={setIsGradingSettingsDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto" dir="rtl" onOpenAutoFocus={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogDescription className="sr-only">نافذة إعدادات تقييم يوم السرد وخصومات الأخطاء والتنبيهات.</DialogDescription>
            <DialogTitle className="text-right text-xl font-black">إعدادات تقييم يوم السرد</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-right">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="text-sm font-bold text-[#1a2332]">الدرجة الأصلية</div>
                <Input
                  type="number"
                  min="0"
                  value={gradingSettingsForm.baseScore}
                  onChange={(event) => setGradingSettingsForm((current) => ({ ...current, baseScore: Math.max(0, Number(event.target.value) || 0) }))}
                  className="border-[#d8e4fb]"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-[#1a2332]">خصم كل خطأ</div>
                <Input
                  type="number"
                  min="0"
                  value={gradingSettingsForm.errorDeduction}
                  onChange={(event) => setGradingSettingsForm((current) => ({ ...current, errorDeduction: Math.max(0, Number(event.target.value) || 0) }))}
                  className="border-[#d8e4fb]"
                />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-bold text-[#1a2332]">خصم كل تنبيه</div>
                <Input
                  type="number"
                  min="0"
                  value={gradingSettingsForm.alertDeduction}
                  onChange={(event) => setGradingSettingsForm((current) => ({ ...current, alertDeduction: Math.max(0, Number(event.target.value) || 0) }))}
                  className="border-[#d8e4fb]"
                />
              </div>
            </div>

            <div className="flex justify-start gap-2">
              <Button type="button" variant="outline" onClick={() => setIsGradingSettingsDialogOpen(false)} className="h-11 rounded-full border-[#d8e4fb] px-6">
                إغلاق
              </Button>
              <Button type="button" onClick={saveGradingSettings} disabled={isSavingGradingSettings} className="h-11 rounded-full bg-[#3453a7] px-6 text-white hover:bg-[#28448e]">
                {isSavingGradingSettings ? "جاري الحفظ..." : "حفظ الإعدادات"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingStudent)} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="max-h-[88vh] max-w-5xl overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-right text-xl font-black">تقييم الطالب</DialogTitle><DialogDescription className="sr-only">نافذة تقييم الطالب وأجزائه في يوم السرد.</DialogDescription></DialogHeader>
          {editingStudent ? (
            <div className="space-y-4 text-right">
              {(() => {
                const aggregate = getStudentAggregate(editingStudent.portions)
                const incompleteMessage = getIncompleteEvaluationMessage(editingStudent, gradingSettingsForm)

                return (
                  <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1"><div className="text-sm font-bold">الطالب</div><div className="rounded-2xl border border-[#e6edf6] bg-[#f9fbff] px-4 py-3">{editingStudent.student_name}</div></div>
                <div className="space-y-1"><div className="text-sm font-bold">الحلقة</div><div className="rounded-2xl border border-[#e6edf6] bg-[#f9fbff] px-4 py-3">{editingStudent.halaqah || "-"}</div></div>
              </div>
              <div className="space-y-3 rounded-[24px] border border-[#e6edf6] bg-[#fbfdff] p-4">
                <div className="text-base font-black text-[#1a2332]">تقييم الأجزاء</div>
                {editingStudent.portions.map((portion) => (
                  <div key={portion.id} className="space-y-4 rounded-[20px] border border-[#e6edf6] bg-white p-4">
                    <div className="space-y-1 text-right">
                      <div className="rounded-2xl border border-[#edf2f7] bg-[#f9fbff] px-3 py-3">
                        <div className="text-sm font-black text-[#1a2332]">{getPortionJuzTitle(portion)}</div>
                        <div className="mt-1 text-xs text-[#526071]">{getPortionRangeText(portion)}</div>
                      </div>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1"><div className="text-sm font-bold text-[#1a2332]">الدرجة المحتسبة</div><div className="rounded-2xl border border-[#d8e4fb] bg-[#f8fafc] px-3 py-3 text-sm font-black text-[#1a2332]">{portion.grade ?? calculatePortionGrade(portion.errors_count, portion.alerts_count)}</div></div>
                      <div className="space-y-1"><div className="text-sm font-bold text-[#1a2332]">الأخطاء</div><Input type="number" value={portion.errors_count} onChange={(event) => setEditingStudent({ ...editingStudent, portions: editingStudent.portions.map((item) => item.id === portion.id ? syncPortionWithGradingSettings(item, { errors_count: Number(event.target.value) || 0 }) : item) })} className="border-[#d8e4fb]" /></div>
                      <div className="space-y-1"><div className="text-sm font-bold text-[#1a2332]">التنبيهات</div><Input type="number" value={portion.alerts_count} onChange={(event) => setEditingStudent({ ...editingStudent, portions: editingStudent.portions.map((item) => item.id === portion.id ? syncPortionWithGradingSettings(item, { alerts_count: Number(event.target.value) || 0 }) : item) })} className="border-[#d8e4fb]" /></div>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className={`rounded-full px-3 py-2 text-sm font-bold ${portion.status === "completed" ? "bg-[#ecfdf3] text-[#166534]" : portion.status === "partial" ? "bg-[#eff6ff] text-[#1d4ed8]" : "bg-[#f8fafc] text-[#64748b]"}`}>{getAutomaticStatusLabel(portion.status)}</div>
                      <Button type="button" onClick={() => savePortion(editingStudent.portions.find((item) => item.id === portion.id) || portion)} disabled={savingPortionId === portion.id} className="h-11 rounded-full bg-[#3453a7] px-5 text-white hover:bg-[#28448e]">{savingPortionId === portion.id ? "جاري الحفظ..." : "حفظ الجزء"}</Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-4 rounded-[24px] border border-[#e6edf6] bg-[#fbfdff] p-4">
                <div className="text-base font-black text-[#1a2332]">التقييم الإجمالي</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1"><div className="text-sm font-bold">اسم المقيّم</div><Input value={editingStudent.evaluator_name || ""} onChange={(event) => setEditingStudent({ ...editingStudent, evaluator_name: event.target.value })} className="border-[#d8e4fb]" /></div>
                  <div className="space-y-1"><div className="text-sm font-bold">ملاحظات المقيّم</div><textarea value={editingStudent.notes || ""} onChange={(event) => setEditingStudent({ ...editingStudent, notes: event.target.value })} className="min-h-[96px] w-full rounded-2xl border border-[#d8e4fb] px-3 py-2 text-sm outline-none" /></div>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1"><div className="text-sm font-bold">الدرجة الإجمالية</div><div className="rounded-2xl border border-[#d8e4fb] bg-white px-3 py-3 text-sm font-black text-[#1a2332]">{aggregate.grade ?? "-"}</div></div>
                  <div className="space-y-1"><div className="text-sm font-bold">مجموع الأخطاء</div><div className="rounded-2xl border border-[#d8e4fb] bg-white px-3 py-3 text-sm font-black text-[#1a2332]">{aggregate.errors}</div></div>
                  <div className="space-y-1"><div className="text-sm font-bold">مجموع التنبيهات</div><div className="rounded-2xl border border-[#d8e4fb] bg-white px-3 py-3 text-sm font-black text-[#1a2332]">{aggregate.alerts}</div></div>
                </div>
                {incompleteMessage ? <div className="text-sm font-bold text-[#b91c1c]">{incompleteMessage}</div> : null}
              </div>
              <div className="flex justify-start gap-2"><Button type="button" variant="outline" onClick={() => setEditingStudent(null)}>إلغاء</Button><Button type="button" onClick={saveStudentEvaluation} disabled={isSavingStudent || Boolean(incompleteMessage)} className="bg-[#3453a7] text-white hover:bg-[#28448e]">{isSavingStudent ? "جاري الحفظ..." : "حفظ التقييم"}</Button></div>
                  </>
                )
              })()}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailsStudent)} onOpenChange={(open) => !open && setDetailsStudent(null)}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-right text-xl font-black">تفاصيل طريقة التسميع</DialogTitle><DialogDescription className="sr-only">نافذة تعرض تفاصيل أجزاء تسميع الطالب الحالية.</DialogDescription></DialogHeader>
          {detailsStudent ? (
            <div className="space-y-4 text-right">
              <div className="rounded-[22px] border border-[#e6edf6] bg-[#f9fbff] px-4 py-4"><div className="text-lg font-black text-[#1a2332]">{detailsStudent.student_name}</div><div className="mt-2 text-sm text-[#526071]">{detailsStudent.full_memorized_text}</div></div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                  <div className="text-xs font-bold text-[#64748b]">مقدار ما سُمّع</div>
                  <div className="mt-1 text-sm font-black text-[#1a2332]">{detailsStudent.heard_amount_text || "-"}</div>
                </div>
                <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                  <div className="text-xs font-bold text-[#64748b]">اسم المقيّم</div>
                  <div className="mt-1 text-sm font-black text-[#1a2332]">{detailsStudent.evaluator_name || "-"}</div>
                </div>
                <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                  <div className="text-xs font-bold text-[#64748b]">الدرجة</div>
                  <div className="mt-1 text-sm font-black text-[#1a2332]">{detailsStudent.grade ?? "-"}</div>
                </div>
                <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                  <div className="text-xs font-bold text-[#64748b]">ملاحظات المقيّم</div>
                  <div className="mt-1 text-sm font-black text-[#1a2332]">{detailsStudent.notes || "-"}</div>
                </div>
              </div>
              <div className="space-y-3">
                {detailsStudent.portions.map((portion) => (
                  <div key={portion.id} className="rounded-[24px] border border-[#e6edf6] bg-white p-4 shadow-sm">
                    <div className="space-y-2">
                      <div className="rounded-2xl border border-[#edf2f7] bg-[#f9fbff] px-3 py-3">
                        <div className="text-sm font-black text-[#1a2332]">{getPortionJuzTitle(portion)}</div>
                        <div className="mt-1 text-xs text-[#526071]">{getPortionRangeText(portion)}</div>
                      </div>
                      <div className="grid gap-3 pt-2 md:grid-cols-4">
                        <div className="rounded-2xl border border-[#edf2f7] bg-[#fbfdff] px-3 py-3 text-center">
                          <div className="text-xs font-bold text-[#64748b]">الدرجة</div>
                          <div className="mt-1 text-sm font-black text-[#1a2332]">{portion.grade ?? "-"}</div>
                        </div>
                        <div className="rounded-2xl border border-[#edf2f7] bg-[#fbfdff] px-3 py-3 text-center">
                          <div className="text-xs font-bold text-[#64748b]">الأخطاء</div>
                          <div className="mt-1 text-sm font-black text-[#1a2332]">{portion.errors_count}</div>
                        </div>
                        <div className="rounded-2xl border border-[#edf2f7] bg-[#fbfdff] px-3 py-3 text-center">
                          <div className="text-xs font-bold text-[#64748b]">التنبيهات</div>
                          <div className="mt-1 text-sm font-black text-[#1a2332]">{portion.alerts_count}</div>
                        </div>
                        <div className="rounded-2xl border border-[#edf2f7] bg-[#fbfdff] px-3 py-3 text-center">
                          <div className="text-xs font-bold text-[#64748b]">اسم المقيّم</div>
                          <div className="mt-1 text-sm font-black text-[#1a2332]">{portion.evaluator_name || "-"}</div>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-[#edf2f7] bg-[#fbfdff] px-3 py-3 text-center">
                        <div className="text-xs font-bold text-[#64748b]">المسمّع</div>
                        <div className="mt-1 text-sm font-black text-[#1a2332]">{portion.heard_amount_text || "-"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(archiveDetailsStudent)} onOpenChange={(open) => !open && setArchiveDetailsStudent(null)}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto" dir="rtl">
          <DialogHeader><DialogTitle className="text-right text-xl font-black">تفاصيل أجزاء التسميع</DialogTitle><DialogDescription className="sr-only">نافذة تعرض تفاصيل أجزاء التسميع المؤرشفة للطالب.</DialogDescription></DialogHeader>
          {archiveDetailsStudent ? (
            <div className="space-y-3 text-right">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                  <div className="text-xs font-bold text-[#64748b]">مقدار ما سُمّع</div>
                  <div className="mt-1 text-sm font-black text-[#1a2332]">{archiveDetailsStudent.heard_amount_text || "-"}</div>
                </div>
                <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                  <div className="text-xs font-bold text-[#64748b]">اسم المقيّم</div>
                  <div className="mt-1 text-sm font-black text-[#1a2332]">{archiveDetailsStudent.evaluator_name || "-"}</div>
                </div>
                <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                  <div className="text-xs font-bold text-[#64748b]">الدرجة</div>
                  <div className="mt-1 text-sm font-black text-[#1a2332]">{archiveDetailsStudent.grade ?? "-"}</div>
                </div>
                <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                  <div className="text-xs font-bold text-[#64748b]">ملاحظات المقيّم</div>
                  <div className="mt-1 text-sm font-black text-[#1a2332]">{archiveDetailsStudent.notes || "-"}</div>
                </div>
              </div>
              {archiveDetailsStudent.portions.map((portion) => (
                <div key={portion.id} className="rounded-[22px] border border-[#e6edf6] bg-[#f9fbff] px-4 py-4">
                  <div className="text-base font-black text-[#1a2332]">{getPortionJuzTitle(portion)}</div>
                  <div className="mt-1 text-sm text-[#526071]">{getPortionRangeText(portion)}</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                      <div className="text-xs font-bold text-[#64748b]">الدرجة</div>
                      <div className="mt-1 text-sm font-black text-[#1a2332]">{portion.grade ?? "-"}</div>
                    </div>
                    <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                      <div className="text-xs font-bold text-[#64748b]">الأخطاء</div>
                      <div className="mt-1 text-sm font-black text-[#1a2332]">{portion.errors_count}</div>
                    </div>
                    <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                      <div className="text-xs font-bold text-[#64748b]">التنبيهات</div>
                      <div className="mt-1 text-sm font-black text-[#1a2332]">{portion.alerts_count}</div>
                    </div>
                    <div className="rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                      <div className="text-xs font-bold text-[#64748b]">اسم المقيّم</div>
                      <div className="mt-1 text-sm font-black text-[#1a2332]">{portion.evaluator_name || "-"}</div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl border border-[#edf2f7] bg-white px-3 py-3 text-center">
                    <div className="text-xs font-bold text-[#64748b]">المسمّع</div>
                    <div className="mt-1 text-sm font-black text-[#1a2332]">{portion.heard_amount_text || "-"}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}