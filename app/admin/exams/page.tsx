"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SiteLoader } from "@/components/ui/site-loader"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAdminAuth } from "@/hooks/use-admin-auth"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { useWhatsAppStatus } from "@/hooks/use-whatsapp-status"
import { calculateExamScore, normalizeExamSettings, type ExamSettings } from "@/lib/exam-settings"
import { normalizeExamPortionSettings, type ExamPortionType } from "@/lib/exam-portion-settings"
import { getPassedPortionNumbers } from "@/lib/exam-portions"
import type { PreviousMemorizationRange } from "@/lib/quran-data"
import { DEFAULT_EXAM_PORTION_SETTINGS, DEFAULT_EXAM_SETTINGS, EXAM_PORTION_SETTINGS_ID, EXAM_SETTINGS_ID } from "@/lib/site-settings-constants"
import { formatExamPortionLabel, getEligibleExamJuzs, getEligibleExamPortions, type StudentExamPlanProgressSource } from "@/lib/student-exams"
import { DEFAULT_EXAM_WHATSAPP_TEMPLATES, EXAM_WHATSAPP_SETTINGS_ID, normalizeExamWhatsAppTemplates, type ExamWhatsAppTemplates } from "@/lib/whatsapp-notification-templates"
import { BellRing, CalendarDays, ChevronLeft, ChevronRight, CircleAlert, ClipboardCheck, Loader2, Save, SlidersHorizontal, Trash2 } from "lucide-react"

type Circle = {
  id: string
  name: string
  studentCount: number
}

type Student = {
  id: string
  name: string
  halaqah: string
  account_number?: number | null
  completed_juzs?: number[] | null
  current_juzs?: number[] | null
  memorized_ranges?: PreviousMemorizationRange[] | null
  memorized_start_surah?: number | null
  memorized_start_verse?: number | null
  memorized_end_surah?: number | null
  memorized_end_verse?: number | null
}

type ExamRow = {
  id: string
  student_id: string
  halaqah: string
  exam_portion_label: string
  portion_type?: ExamPortionType | null
  portion_number?: number | null
  juz_number: number | null
  exam_date: string
  alerts_count: number
  mistakes_count: number
  final_score: number
  passed: boolean
  notes?: string | null
  tested_by_name?: string | null
  students?: { name?: string | null; account_number?: number | null } | Array<{ name?: string | null; account_number?: number | null }> | null
}

type ExamFormState = {
  studentId: string
  examDate: string
  selectedJuz: string
  testedByName: string
  alertsCount: string
  mistakesCount: string
}

type SettingsForm = {
  maxScore: string
  alertDeduction: string
  mistakeDeduction: string
  minPassingScore: string
  portionMode: ExamPortionType
}

type NotificationTemplatesForm = {
  create: string
  update: string
  cancel: string
  result: string
}

type StudentPlanProgressState = {
  plan: StudentExamPlanProgressSource | null
  completedDays: number
}

type ScheduleExamForm = {
  juzNumber: string
  examDate: string
}

type FailedExamAction = "retest" | "rememorize"

type FailedExamActionForm = {
  action: FailedExamAction
  retestDate: string
}

const ALL_CIRCLES_VALUE = "__all_circles__"
const OVERVIEW_PAGE_SIZE = 5

function getTodayDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date())
}

type ExamScheduleRow = {
  id: string
  student_id: string
  halaqah: string
  exam_portion_label: string
  portion_type?: ExamPortionType | null
  portion_number?: number | null
  juz_number: number
  exam_date: string
  status: "scheduled" | "completed" | "cancelled"
  notification_sent_at?: string | null
  completed_exam_id?: string | null
  completed_at?: string | null
  cancelled_at?: string | null
  scheduled_by_name?: string | null
  scheduled_by_role?: string | null
  created_at: string
  updated_at: string
  students?: { name?: string | null } | Array<{ name?: string | null }> | null
}

const DEFAULT_FORM: ExamFormState = {
  studentId: "",
  examDate: getTodayDate(),
  selectedJuz: "",
  testedByName: "",
  alertsCount: "0",
  mistakesCount: "0",
}

const DEFAULT_SETTINGS_FORM: SettingsForm = {
  maxScore: String(DEFAULT_EXAM_SETTINGS.maxScore),
  alertDeduction: String(DEFAULT_EXAM_SETTINGS.alertDeduction),
  mistakeDeduction: String(DEFAULT_EXAM_SETTINGS.mistakeDeduction),
  minPassingScore: String(DEFAULT_EXAM_SETTINGS.minPassingScore),
  portionMode: DEFAULT_EXAM_PORTION_SETTINGS.mode,
}

const DEFAULT_NOTIFICATION_TEMPLATES_FORM: NotificationTemplatesForm = {
  create: DEFAULT_EXAM_WHATSAPP_TEMPLATES.create,
  update: DEFAULT_EXAM_WHATSAPP_TEMPLATES.update,
  cancel: DEFAULT_EXAM_WHATSAPP_TEMPLATES.cancel,
  result: DEFAULT_EXAM_WHATSAPP_TEMPLATES.result,
}

const DEFAULT_SCHEDULE_FORM: ScheduleExamForm = {
  juzNumber: "",
  examDate: getTodayDate(),
}

const DEFAULT_FAILED_EXAM_ACTION_FORM: FailedExamActionForm = {
  action: "retest",
  retestDate: getTodayDate(),
}

function toSettingsForm(settings: ExamSettings): SettingsForm {
  return {
    maxScore: String(settings.maxScore),
    alertDeduction: String(settings.alertDeduction),
    mistakeDeduction: String(settings.mistakeDeduction),
    minPassingScore: String(settings.minPassingScore),
    portionMode: DEFAULT_EXAM_PORTION_SETTINGS.mode,
  }
}

function fromSettingsForm(form: SettingsForm): ExamSettings {
  return normalizeExamSettings({
    maxScore: form.maxScore,
    alertDeduction: form.alertDeduction,
    mistakeDeduction: form.mistakeDeduction,
    minPassingScore: form.minPassingScore,
  })
}

function toNotificationTemplatesForm(templates: ExamWhatsAppTemplates): NotificationTemplatesForm {
  return {
    create: templates.create,
    update: templates.update,
    cancel: templates.cancel,
    result: templates.result,
  }
}

function fromNotificationTemplatesForm(form: NotificationTemplatesForm): ExamWhatsAppTemplates {
  return normalizeExamWhatsAppTemplates(form)
}

function parseCount(value: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0
  }

  return Math.floor(parsed)
}

function normalizeScheduleStudentRelation(value: ExamScheduleRow["students"]) {
  if (Array.isArray(value)) {
    return value[0] || null
  }

  return value || null
}

function getScheduleStatusTone(status: ExamScheduleRow["status"]) {
  if (status === "completed") {
    return "bg-[#ecfdf5] text-[#166534]"
  }

  if (status === "cancelled") {
    return "bg-[#fef2f2] text-[#b91c1c]"
  }

  return "bg-[#eff6ff] text-[#3453a7]"
}

function getScheduleStatusLabel(status: ExamScheduleRow["status"]) {
  if (status === "completed") {
    return "مكتمل"
  }

  if (status === "cancelled") {
    return "ملغي"
  }

  return "مجدول"
}

function isScheduleOverdue(schedule: ExamScheduleRow) {
  return schedule.status === "scheduled" && schedule.exam_date < getTodayDate()
}

export default function AdminExamsPage() {
  const { isLoading: authLoading, isVerified: authVerified } = useAdminAuth("إدارة الاختبارات")
  const { isReady: isWhatsAppReady, isLoading: isWhatsAppStatusLoading } = useWhatsAppStatus()
  const showAlert = useAlertDialog()
  const [isLoading, setIsLoading] = useState(true)
  const [isCircleDataLoading, setIsCircleDataLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [sendingScheduleStudentId, setSendingScheduleStudentId] = useState<string | null>(null)
  const [isCancellingScheduleId, setIsCancellingScheduleId] = useState<string | null>(null)
  const [isExamDialogOpen, setIsExamDialogOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isTemplatesDialogOpen, setIsTemplatesDialogOpen] = useState(false)
  const [isSchedulesOverviewOpen, setIsSchedulesOverviewOpen] = useState(false)
  const [isFailedExamActionDialogOpen, setIsFailedExamActionDialogOpen] = useState(false)
  const [tableMissing, setTableMissing] = useState(false)
  const [schedulesTableMissing, setSchedulesTableMissing] = useState(false)
  const [circles, setCircles] = useState<Circle[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [exams, setExams] = useState<ExamRow[]>([])
  const [examSchedules, setExamSchedules] = useState<ExamScheduleRow[]>([])
  const [overviewSchedules, setOverviewSchedules] = useState<ExamScheduleRow[]>([])
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(DEFAULT_SETTINGS_FORM)
  const [notificationTemplatesForm, setNotificationTemplatesForm] = useState<NotificationTemplatesForm>(DEFAULT_NOTIFICATION_TEMPLATES_FORM)
  const [portionMode, setPortionMode] = useState<ExamPortionType>(DEFAULT_EXAM_PORTION_SETTINGS.mode)
  const [selectedCircle, setSelectedCircle] = useState("")
  const [examDialogCircle, setExamDialogCircle] = useState("")
  const [form, setForm] = useState<ExamFormState>(DEFAULT_FORM)
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, ScheduleExamForm>>({})
  const [studentPlanProgressMap, setStudentPlanProgressMap] = useState<Record<string, StudentPlanProgressState>>({})
  const [examDialogStudents, setExamDialogStudents] = useState<Student[]>([])
  const [examDialogExams, setExamDialogExams] = useState<ExamRow[]>([])
  const [examDialogPlanProgressMap, setExamDialogPlanProgressMap] = useState<Record<string, StudentPlanProgressState>>({})
  const [isExamDialogLoading, setIsExamDialogLoading] = useState(false)
  const [isSavingTemplates, setIsSavingTemplates] = useState(false)
  const [overviewCircleFilter, setOverviewCircleFilter] = useState<string>(ALL_CIRCLES_VALUE)
  const [overviewDateFilter, setOverviewDateFilter] = useState(getTodayDate())
  const [overviewPage, setOverviewPage] = useState(1)
  const [isOverviewSchedulesLoading, setIsOverviewSchedulesLoading] = useState(false)
  const [overviewSchedulesTableMissing, setOverviewSchedulesTableMissing] = useState(false)
  const [failedExamActionForm, setFailedExamActionForm] = useState<FailedExamActionForm>(DEFAULT_FAILED_EXAM_ACTION_FORM)

  useEffect(() => {
    async function bootstrap() {
      if (authLoading || !authVerified) {
        return
      }

      const savedUserName = localStorage.getItem("userName") || ""
      if (savedUserName) {
        setForm((current) => (current.testedByName ? current : { ...current, testedByName: savedUserName }))
      }

      try {
        const [circlesResponse, settingsResponse, notificationTemplatesResponse, portionSettingsResponse] = await Promise.all([
          fetch("/api/circles", { cache: "no-store" }),
          fetch(`/api/site-settings?id=${EXAM_SETTINGS_ID}`, { cache: "no-store" }),
          fetch(`/api/site-settings?id=${EXAM_WHATSAPP_SETTINGS_ID}`, { cache: "no-store" }),
          fetch(`/api/site-settings?id=${EXAM_PORTION_SETTINGS_ID}`, { cache: "no-store" }),
        ])

        if (!circlesResponse.ok || !settingsResponse.ok || !notificationTemplatesResponse.ok || !portionSettingsResponse.ok) {
          throw new Error("تعذر تحميل بيانات صفحة الاختبارات")
        }

        const circlesData = await circlesResponse.json()
        const settingsData = await settingsResponse.json()
        const notificationTemplatesData = await notificationTemplatesResponse.json()
        const portionSettingsData = await portionSettingsResponse.json()
        const loadedCircles = (circlesData.circles || []) as Circle[]
        const normalizedPortionSettings = normalizeExamPortionSettings(portionSettingsData.value)

        setCircles(loadedCircles)
        setSettingsForm({ ...toSettingsForm(normalizeExamSettings(settingsData.value)), portionMode: normalizedPortionSettings.mode })
        setNotificationTemplatesForm(toNotificationTemplatesForm(normalizeExamWhatsAppTemplates(notificationTemplatesData.value)))
        setPortionMode(normalizedPortionSettings.mode)

      } catch (error) {
        console.error("[admin-exams] bootstrap:", error)
      } finally {
        setIsLoading(false)
      }
    }

    void bootstrap()
  }, [authLoading, authVerified])

  useEffect(() => {
    if (!isExamDialogOpen) {
      return
    }

    setExamDialogCircle((current) => current || selectedCircle)
  }, [isExamDialogOpen, selectedCircle])

  useEffect(() => {
    async function loadStudentsAndExams() {
      if (authLoading || !authVerified) {
        return
      }

      if (!selectedCircle) {
        setStudents([])
        setExams([])
        setExamSchedules([])
        setScheduleDrafts({})
        setStudentPlanProgressMap({})
        setIsCircleDataLoading(false)
        setForm((current) => ({ ...current, studentId: "", selectedJuz: "" }))
        return
      }

      try {
        setIsCircleDataLoading(true)
        const [studentsResponse, examsResponse, schedulesResponse] = await Promise.all([
          fetch(`/api/students?circle=${encodeURIComponent(selectedCircle)}`, { cache: "no-store" }),
          fetch(`/api/exams?circle=${encodeURIComponent(selectedCircle)}`, { cache: "no-store" }),
          fetch(`/api/exam-schedules?circle=${encodeURIComponent(selectedCircle)}`, { cache: "no-store" }),
        ])

        if (!studentsResponse.ok || !examsResponse.ok || !schedulesResponse.ok) {
          throw new Error("تعذر تحميل الطلاب أو الاختبارات")
        }

        const studentsData = await studentsResponse.json()
        const examsData = await examsResponse.json()
        const schedulesData = await schedulesResponse.json()
        const loadedStudents = (studentsData.students || []) as Student[]
        const ids = loadedStudents.map((student) => student.id).join(",")
        const batchPlanResponse = loadedStudents.length > 0
          ? await fetch(`/api/student-plans?student_ids=${encodeURIComponent(ids)}`, { cache: "no-store" })
          : null
        const batchPlanData = batchPlanResponse && batchPlanResponse.ok
          ? await batchPlanResponse.json()
          : { plansByStudent: {} }
        const planEntries = loadedStudents.map((student) => ([
          student.id,
          {
            plan: (batchPlanData.plansByStudent?.[student.id]?.plan || null) as StudentExamPlanProgressSource | null,
            completedDays: Number(batchPlanData.plansByStudent?.[student.id]?.completedDays) || 0,
          },
        ] as const))

        setStudents(loadedStudents)
        setExams((examsData.exams || []) as ExamRow[])
        setExamSchedules(((schedulesData.schedules || []) as ExamScheduleRow[]).filter((schedule) => schedule.status === "scheduled"))
        setSchedulesTableMissing(Boolean(schedulesData.tableMissing))
        setTableMissing(Boolean(examsData.tableMissing))
        setStudentPlanProgressMap(Object.fromEntries(planEntries))
      } catch (error) {
        console.error("[admin-exams] load:", error)
      } finally {
        setIsCircleDataLoading(false)
      }
    }

    void loadStudentsAndExams()
  }, [authLoading, authVerified, selectedCircle])

  useEffect(() => {
    async function loadExamDialogData() {
      if (authLoading || !authVerified || !isExamDialogOpen) {
        return
      }

      if (!examDialogCircle) {
        setExamDialogStudents([])
        setExamDialogExams([])
        setExamDialogPlanProgressMap({})
        setForm((current) => ({ ...current, studentId: "", selectedJuz: "", alertsCount: "0", mistakesCount: "0" }))
        setIsExamDialogLoading(false)
        return
      }

      try {
        setIsExamDialogLoading(true)
        const [studentsResponse, examsResponse] = await Promise.all([
          fetch(`/api/students?circle=${encodeURIComponent(examDialogCircle)}`, { cache: "no-store" }),
          fetch(`/api/exams?circle=${encodeURIComponent(examDialogCircle)}`, { cache: "no-store" }),
        ])

        if (!studentsResponse.ok || !examsResponse.ok) {
          throw new Error("تعذر تحميل بيانات نافذة الاختبار")
        }

        const studentsData = await studentsResponse.json()
        const examsData = await examsResponse.json()
        const loadedStudents = (studentsData.students || []) as Student[]
        const ids = loadedStudents.map((student) => student.id).join(",")
        const batchPlanResponse = loadedStudents.length > 0
          ? await fetch(`/api/student-plans?student_ids=${encodeURIComponent(ids)}`, { cache: "no-store" })
          : null
        const batchPlanData = batchPlanResponse && batchPlanResponse.ok
          ? await batchPlanResponse.json()
          : { plansByStudent: {} }
        const planEntries = loadedStudents.map((student) => ([
          student.id,
          {
            plan: (batchPlanData.plansByStudent?.[student.id]?.plan || null) as StudentExamPlanProgressSource | null,
            completedDays: Number(batchPlanData.plansByStudent?.[student.id]?.completedDays) || 0,
          },
        ] as const))

        setExamDialogStudents(loadedStudents)
        setExamDialogExams((examsData.exams || []) as ExamRow[])
        setExamDialogPlanProgressMap(Object.fromEntries(planEntries))
        setTableMissing(Boolean(examsData.tableMissing))
        setForm((current) => {
          const nextStudentId = loadedStudents.some((student) => student.id === current.studentId)
            ? current.studentId
            : (loadedStudents[0]?.id || "")

          return {
            ...current,
            studentId: nextStudentId,
          }
        })
      } catch (error) {
        console.error("[admin-exams] load exam dialog:", error)
        setExamDialogStudents([])
        setExamDialogExams([])
        setExamDialogPlanProgressMap({})
      } finally {
        setIsExamDialogLoading(false)
      }
    }

    void loadExamDialogData()
  }, [authLoading, authVerified, examDialogCircle, isExamDialogOpen])

  const settingsPreview = useMemo(() => fromSettingsForm(settingsForm), [settingsForm])
  const portionUnitLabel = portionMode === "hizb" ? "الحزب" : "الجزء"
  const filteredStudents = useMemo(() => students, [students])
  const examDialogFilteredStudents = useMemo(() => examDialogStudents, [examDialogStudents])
  const activeSchedulesByStudentId = useMemo(() => {
    const grouped = new Map<string, ExamScheduleRow[]>()

    for (const schedule of examSchedules) {
      if (schedule.status !== "scheduled") {
        continue
      }

      const current = grouped.get(schedule.student_id) || []
      current.push(schedule)
      grouped.set(schedule.student_id, current)
    }

    return grouped
  }, [examSchedules])
  const selectedStudent = useMemo(() => examDialogFilteredStudents.find((student) => student.id === form.studentId) || null, [examDialogFilteredStudents, form.studentId])
  const selectedStudentPlanProgress = useMemo(() => {
    if (!form.studentId) {
      return null
    }

    return examDialogPlanProgressMap[form.studentId] || null
  }, [examDialogPlanProgressMap, form.studentId])
  const studentExams = useMemo(() => examDialogExams.filter((exam) => exam.student_id === form.studentId), [examDialogExams, form.studentId])
  const eligiblePortions = useMemo(() => getEligibleExamPortions(selectedStudent, selectedStudentPlanProgress, portionMode), [selectedStudent, selectedStudentPlanProgress, portionMode])
  const eligiblePortionNumbers = useMemo(() => eligiblePortions.map((portion) => portion.portionNumber), [eligiblePortions])
  const passedPortionNumbers = useMemo(() => getPassedPortionNumbers(studentExams, portionMode), [studentExams, portionMode])
  const availablePortions = useMemo(() => eligiblePortions.filter((portion) => !passedPortionNumbers.has(portion.portionNumber)), [eligiblePortions, passedPortionNumbers])
  const availableJuzs = useMemo(() => availablePortions.map((portion) => portion.portionNumber), [availablePortions])
  const studentScheduleRows = useMemo(() => {
    return filteredStudents.map((student) => {
      const studentPlanProgress = studentPlanProgressMap[student.id] || null
      const studentExamsList = exams.filter((exam) => exam.student_id === student.id)
      const studentPassedPortions = getPassedPortionNumbers(studentExamsList, portionMode)
      const eligibleStudentPortions = getEligibleExamPortions(student, studentPlanProgress, portionMode)
      const studentSchedules = [...(activeSchedulesByStudentId.get(student.id) || [])].sort((left, right) => left.exam_date.localeCompare(right.exam_date) || left.created_at.localeCompare(right.created_at))
      const scheduledPortionNumbers = new Set(studentSchedules.map((schedule) => Number(schedule.portion_number || schedule.juz_number)))
      const availableStudentPortions = eligibleStudentPortions.filter((portion) => !studentPassedPortions.has(portion.portionNumber) && !scheduledPortionNumbers.has(portion.portionNumber))
      const draft = scheduleDrafts[student.id]
      const draftPortionNumber = draft?.juzNumber && availableStudentPortions.some((portion) => String(portion.portionNumber) === draft.juzNumber)
          ? draft.juzNumber
          : (availableStudentPortions[0] ? String(availableStudentPortions[0].portionNumber) : "")
      const draftExamDate = draft?.examDate || getTodayDate()
      const draftPortionLabel = availableStudentPortions.find((portion) => String(portion.portionNumber) === draftPortionNumber)?.label || ""

      return {
        student,
        scheduledCount: studentSchedules.length,
        availablePortions: availableStudentPortions,
        draftPortionNumber,
        draftExamDate,
        draftPortionLabel,
        hasEligiblePortions: eligibleStudentPortions.length > 0,
      }
    })
  }, [activeSchedulesByStudentId, exams, filteredStudents, portionMode, scheduleDrafts, studentPlanProgressMap])
  const scorePreview = useMemo(
    () => calculateExamScore({ alerts: parseCount(form.alertsCount), mistakes: parseCount(form.mistakesCount) }, settingsPreview),
    [form.alertsCount, form.mistakesCount, settingsPreview],
  )

  useEffect(() => {
    if (!selectedStudent) {
      setForm((current) => ({ ...current, selectedJuz: "" }))
      return
    }

    setForm((current) => {
      const canKeepSelectedJuz = current.selectedJuz && availableJuzs.includes(Number(current.selectedJuz))
      if (canKeepSelectedJuz) {
        return current
      }

      const nextJuz = availableJuzs[0]
      return {
        ...current,
        selectedJuz: nextJuz ? String(nextJuz) : "",
      }
    })
  }, [availableJuzs, selectedStudent])

  useEffect(() => {
    setForm((current) => {
      const nextStudentId = examDialogFilteredStudents.some((student) => student.id === current.studentId)
        ? current.studentId
        : ""

      if (nextStudentId === current.studentId) {
        return current
      }

      return {
        ...current,
        studentId: nextStudentId,
        selectedJuz: "",
        alertsCount: "0",
        mistakesCount: "0",
      }
    })
  }, [examDialogFilteredStudents])

  const loadCircleSchedules = async (circleName: string) => {
    if (!circleName) {
      setExamSchedules([])
      setSchedulesTableMissing(false)
      return
    }

    try {
      const response = await fetch(`/api/exam-schedules?circle=${encodeURIComponent(circleName)}`, { cache: "no-store" })
      const data = await response.json()
      setExamSchedules(((data.schedules || []) as ExamScheduleRow[]).filter((schedule) => schedule.status === "scheduled"))
      setSchedulesTableMissing(Boolean(data.tableMissing))
    } catch (error) {
      console.error("[admin-exams] load schedules:", error)
      setExamSchedules([])
    }
  }

  const loadOverviewSchedules = async (circleFilter: string) => {
    try {
      setIsOverviewSchedulesLoading(true)
      const query = circleFilter !== ALL_CIRCLES_VALUE ? `?circle=${encodeURIComponent(circleFilter)}` : ""
      const response = await fetch(`/api/exam-schedules${query}`, { cache: "no-store" })
      const data = await response.json()
      setOverviewSchedules(((data.schedules || []) as ExamScheduleRow[]).filter((schedule) => schedule.status === "scheduled"))
      setOverviewSchedulesTableMissing(Boolean(data.tableMissing))
    } catch (error) {
      console.error("[admin-exams] load overview schedules:", error)
      setOverviewSchedules([])
      setOverviewSchedulesTableMissing(false)
    } finally {
      setIsOverviewSchedulesLoading(false)
    }
  }

  useEffect(() => {
    if (!isSchedulesOverviewOpen) {
      return
    }

    setOverviewDateFilter(getTodayDate())
    void loadOverviewSchedules(overviewCircleFilter)
  }, [isSchedulesOverviewOpen, overviewCircleFilter])

  useEffect(() => {
    setOverviewPage(1)
  }, [overviewCircleFilter, overviewDateFilter, isSchedulesOverviewOpen])

  const overviewDateSchedules = useMemo(() => {
    if (!overviewDateFilter) {
      return []
    }

    return overviewSchedules.filter((schedule) => schedule.exam_date === overviewDateFilter)
  }, [overviewSchedules, overviewDateFilter])

  const overviewPageCount = Math.max(1, Math.ceil(overviewDateSchedules.length / OVERVIEW_PAGE_SIZE))
  const paginatedOverviewSchedules = useMemo(() => {
    const startIndex = (overviewPage - 1) * OVERVIEW_PAGE_SIZE
    return overviewDateSchedules.slice(startIndex, startIndex + OVERVIEW_PAGE_SIZE)
  }, [overviewDateSchedules, overviewPage])

  const handleSettingsChange = (field: keyof SettingsForm, value: string) => {
    setSettingsForm((current) => ({ ...current, [field]: value }))
  }

  const handleNotificationTemplateChange = (field: keyof NotificationTemplatesForm, value: string) => {
    setNotificationTemplatesForm((current) => ({ ...current, [field]: value }))
  }

  const updateScheduleDraft = (studentId: string, nextValues: Partial<ScheduleExamForm>) => {
    setScheduleDrafts((current) => ({
      ...current,
      [studentId]: {
        juzNumber: nextValues.juzNumber ?? current[studentId]?.juzNumber ?? "",
        examDate: nextValues.examDate ?? current[studentId]?.examDate ?? getTodayDate(),
      },
    }))
  }

  const handlePortionModeChange = (value: string) => {
    const nextMode = value === "hizb" ? "hizb" : "juz"
    setPortionMode(nextMode)
    setSettingsForm((current) => ({ ...current, portionMode: nextMode }))
  }

  const handleSaveSettings = async () => {
    const nextSettings = fromSettingsForm(settingsForm)

    try {
      setIsSavingSettings(true)
      const [settingsResponse, portionSettingsResponse] = await Promise.all([
        fetch("/api/site-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: EXAM_SETTINGS_ID,
            value: nextSettings,
          }),
        }),
        fetch("/api/site-settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: EXAM_PORTION_SETTINGS_ID,
            value: { mode: settingsForm.portionMode },
          }),
        }),
      ])

      const [settingsData, portionSettingsData] = await Promise.all([
        settingsResponse.json(),
        portionSettingsResponse.json(),
      ])

      if (!settingsResponse.ok || !settingsData.success) {
        throw new Error(settingsData.error || "تعذر حفظ إعدادات الاختبارات")
      }

      if (!portionSettingsResponse.ok || !portionSettingsData.success) {
        throw new Error(portionSettingsData.error || "تعذر حفظ وضع الاختبارات")
      }

      setSettingsForm({ ...toSettingsForm(nextSettings), portionMode: settingsForm.portionMode })
      setPortionMode(settingsForm.portionMode)
      setIsSettingsOpen(false)
      await showAlert("تم حفظ إعدادات الاختبارات بنجاح", "نجاح")
    } catch (error) {
      console.error("[admin-exams] save settings:", error)
      await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ الإعدادات", "خطأ")
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleSaveTemplates = async () => {
    const nextNotificationTemplates = fromNotificationTemplatesForm(notificationTemplatesForm)

    try {
      setIsSavingTemplates(true)
      const templatesResponse = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: EXAM_WHATSAPP_SETTINGS_ID,
          value: nextNotificationTemplates,
        }),
      })

      const templatesData = await templatesResponse.json()

      if (!templatesResponse.ok || !templatesData.success) {
        throw new Error(templatesData.error || "تعذر حفظ قوالب واتساب للاختبارات")
      }

      setNotificationTemplatesForm(toNotificationTemplatesForm(nextNotificationTemplates))
      setIsTemplatesDialogOpen(false)
      await showAlert("تم حفظ قوالب الاختبارات بنجاح", "نجاح")
    } catch (error) {
      console.error("[admin-exams] save templates:", error)
      await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ القوالب", "خطأ")
    } finally {
      setIsSavingTemplates(false)
    }
  }

  const submitExam = async (failureAction?: FailedExamAction, retestDate?: string) => {
    const selectedJuz = Number(form.selectedJuz)
    const selectedPortion = eligiblePortions.find((portion) => portion.portionNumber === selectedJuz)

    const response = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: form.studentId,
        exam_date: getTodayDate(),
        portion_type: portionMode,
        portion_number: selectedJuz,
        exam_portion_label: selectedPortion?.label || formatExamPortionLabel(selectedJuz, "", portionMode),
        tested_by_name: form.testedByName.trim(),
        alerts_count: parseCount(form.alertsCount),
        mistakes_count: parseCount(form.mistakesCount),
        failure_action: failureAction,
        retest_date: retestDate,
      }),
    })

    const data = await response.json()
    if (!response.ok || !data.success) {
      throw new Error(data.error || "تعذر حفظ الاختبار")
    }

    const finalScore = data.score?.finalScore ?? scorePreview.finalScore
    const passed = Boolean(data.score?.passed)
    const resetWarning = typeof data.resetWarning === "string" ? data.resetWarning : ""
    const notificationWarning = typeof data.notificationWarning === "string" ? data.notificationWarning : ""
    const scheduledRetest = Boolean(data.scheduledRetest)
    const retestDateLabel = typeof data.retestDate === "string" ? data.retestDate : ""

    if (passed) {
      await showAlert(notificationWarning || `تم حفظ الاختبار بنتيجة ${finalScore} من ${settingsPreview.maxScore}`, notificationWarning ? "تنبيه" : "نجاح")
    } else if (scheduledRetest) {
      await showAlert(notificationWarning || resetWarning || `تم تسجيل الرسوب بنتيجة ${finalScore} من ${settingsPreview.maxScore}، وتم تحديد إعادة اختبار ${portionUnitLabel}${retestDateLabel ? ` بتاريخ ${retestDateLabel}` : ""}.`, "تنبيه")
    } else if (data.requiresRememorization) {
      await showAlert(notificationWarning || `تم تسجيل الرسوب بنتيجة ${finalScore} من ${settingsPreview.maxScore}، وتم تحويل هذا ${portionUnitLabel} إلى ${portionUnitLabel} يحتاج إعادة حفظ مع استمرار الخطة الحالية.`, "تنبيه")
    } else {
      await showAlert(notificationWarning || resetWarning || `تم تسجيل الرسوب بنتيجة ${finalScore} من ${settingsPreview.maxScore}.`, "تنبيه")
    }

    setForm((current) => ({
      ...current,
      alertsCount: "0",
      mistakesCount: "0",
    }))

    const [studentsResponse, examsResponse] = await Promise.all([
      fetch(`/api/students?circle=${encodeURIComponent(examDialogCircle)}`, { cache: "no-store" }),
      fetch(`/api/exams?circle=${encodeURIComponent(examDialogCircle)}`, { cache: "no-store" }),
    ])

    const studentsData = await studentsResponse.json()
    const examsData = await examsResponse.json()
    const loadedStudents = (studentsData.students || []) as Student[]
    const ids = loadedStudents.map((student) => student.id).join(",")
    const batchPlanResponse = loadedStudents.length > 0
      ? await fetch(`/api/student-plans?student_ids=${encodeURIComponent(ids)}`, { cache: "no-store" })
      : null
    const batchPlanData = batchPlanResponse && batchPlanResponse.ok
      ? await batchPlanResponse.json()
      : { plansByStudent: {} }
    const planEntries = loadedStudents.map((student) => ([
      student.id,
      {
        plan: (batchPlanData.plansByStudent?.[student.id]?.plan || null) as StudentExamPlanProgressSource | null,
        completedDays: Number(batchPlanData.plansByStudent?.[student.id]?.completedDays) || 0,
      },
    ] as const))

    setExamDialogStudents(loadedStudents)
    setExamDialogExams((examsData.exams || []) as ExamRow[])
    setTableMissing(Boolean(examsData.tableMissing))
    setExamDialogPlanProgressMap(Object.fromEntries(planEntries))
  }

  const handleSaveExam = async () => {
    if (!form.studentId) {
      await showAlert("اختر الطالب أولاً", "تنبيه")
      return
    }

    if (!form.selectedJuz) {
      await showAlert(`اختر ${portionUnitLabel} المختبر من القائمة`, "تنبيه")
      return
    }

    if (!form.testedByName.trim()) {
      await showAlert("أدخل اسم المختبر أولاً", "تنبيه")
      return
    }

    if (!scorePreview.passed) {
      setFailedExamActionForm({
        action: "retest",
        retestDate: getTodayDate(),
      })
      setIsFailedExamActionDialogOpen(true)
      return
    }

    try {
      setIsSaving(true)
      await submitExam()
    } catch (error) {
      console.error("[admin-exams] save:", error)
      await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ الاختبار", "خطأ")
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmFailedExamAction = async () => {
    if (failedExamActionForm.action === "retest" && !failedExamActionForm.retestDate) {
      await showAlert("اختر تاريخ إعادة الاختبار", "تنبيه")
      return
    }

    try {
      setIsSaving(true)
      setIsFailedExamActionDialogOpen(false)
      await submitExam(failedExamActionForm.action, failedExamActionForm.action === "retest" ? failedExamActionForm.retestDate : undefined)
      setFailedExamActionForm(DEFAULT_FAILED_EXAM_ACTION_FORM)
    } catch (error) {
      console.error("[admin-exams] save failed action:", error)
      await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ قرار الرسوب", "خطأ")
      setIsFailedExamActionDialogOpen(true)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendScheduleNotification = async (studentId: string) => {
    const targetStudent = studentScheduleRows.find((row) => row.student.id === studentId)
    if (!targetStudent) {
      await showAlert("تعذر العثور على الطالب المحدد", "تنبيه")
      return
    }

    if (!targetStudent.draftPortionNumber) {
      await showAlert(`اختر ${portionUnitLabel} المراد جدولة اختباره`, "تنبيه")
      return
    }

    if (!targetStudent.draftExamDate) {
      await showAlert("اختر تاريخ الاختبار", "تنبيه")
      return
    }

    try {
      setSendingScheduleStudentId(studentId)

      const response = await fetch("/api/exam-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          portion_type: portionMode,
          portion_number: Number(targetStudent.draftPortionNumber),
          exam_portion_label: targetStudent.draftPortionLabel || formatExamPortionLabel(Number(targetStudent.draftPortionNumber), "", portionMode),
          exam_date: targetStudent.draftExamDate,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر إرسال تنبيه الاختبار")
      }

      await loadCircleSchedules(selectedCircle)
      if (isSchedulesOverviewOpen) {
        await loadOverviewSchedules(overviewCircleFilter)
      }
    } catch (error) {
      console.error("[admin-exams] send schedule notification:", error)
      await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء إرسال تنبيه الاختبار", "خطأ")
    } finally {
      setSendingScheduleStudentId(null)
    }
  }

  const handleCancelSchedule = async (scheduleId: string, studentIdOverride?: string) => {
    const targetStudentId = studentIdOverride || form.studentId

    if (!targetStudentId) {
      return
    }

    try {
      setIsCancellingScheduleId(scheduleId)
      const response = await fetch(`/api/exam-schedules?id=${encodeURIComponent(scheduleId)}`, {
        method: "DELETE",
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر إلغاء موعد الاختبار")
      }

      await loadCircleSchedules(selectedCircle)
      if (isSchedulesOverviewOpen) {
        await loadOverviewSchedules(overviewCircleFilter)
      }
      await showAlert("تم إلغاء موعد الاختبار، مع إشعار الطالب داخل المنصة وإرسال رسالة لولي الأمر عبر الواتساب", "نجاح")
    } catch (error) {
      console.error("[admin-exams] cancel schedule:", error)
      await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء إلغاء موعد الاختبار", "خطأ")
    } finally {
      setIsCancellingScheduleId(null)
    }
  }

  if (isLoading || authLoading || !authVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <SiteLoader size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      <Header />
      <main className="px-4 py-8 md:px-6 md:py-10">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="text-right">
            <h1 className="text-3xl font-black tracking-tight text-[#1a2332] md:text-4xl">إدارة الاختبارات</h1>
          </div>

          {!isWhatsAppStatusLoading && !isWhatsAppReady ? (
            <div className="text-right text-sm font-black leading-7 text-[#b91c1c]">
              واتس اب غير مربوط حاليا، إربطه بالباركود لتتمكن من الإرسال الى اولياء الأمور.
            </div>
          ) : null}

          <div className="flex flex-col items-stretch justify-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Button type="button" onClick={() => setIsSchedulesOverviewOpen(true)} className="h-11 w-full rounded-2xl bg-[#3453a7] px-6 text-sm font-black text-white hover:bg-[#274187] sm:w-auto">
              <CalendarDays className="me-2 h-4 w-4" />
              المواعيد
            </Button>

            <Button type="button" onClick={() => setIsExamDialogOpen(true)} className="h-11 w-full rounded-2xl bg-[#3453a7] px-6 text-sm font-black text-white hover:bg-[#274187] sm:w-auto">
              <ClipboardCheck className="me-2 h-4 w-4" />
              اختبار الطلاب
            </Button>

            <Button type="button" onClick={() => setIsSettingsOpen(true)} className="h-11 w-full rounded-2xl bg-[#3453a7] px-6 text-sm font-black text-white hover:bg-[#274187] sm:w-auto">
              <SlidersHorizontal className="me-2 h-4 w-4" />
              إعدادات الاختبارات
            </Button>
          </div>

          <div className="rounded-[28px] border border-[#dbe5f1] bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
            <div className="text-right">
              <div className="flex max-w-full flex-col gap-4 md:flex-row md:items-end">
                <div className="w-full min-w-0 space-y-2 text-right md:w-[280px]">
                  <Label className="text-sm font-black text-[#334155]">الحلقة</Label>
                  <Select value={selectedCircle} onValueChange={setSelectedCircle} dir="rtl">
                    <SelectTrigger className="h-12 rounded-2xl border-[#d7e3f2] bg-white px-4 shadow-sm">
                      <SelectValue placeholder="اختر الحلقة" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {circles.map((circle) => (
                        <SelectItem key={circle.id} value={circle.name}>{circle.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {selectedCircle ? (
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-start gap-2 text-right">
                  <BellRing className="h-5 w-5 text-[#3453a7]" />
                  <div className="text-lg font-black text-[#1a2332]">جدولة الاختبارات</div>
                </div>

                {schedulesTableMissing ? (
                  <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-right text-sm font-bold leading-7 text-amber-800">
                    جدول مواعيد الاختبارات غير موجود بعد. شغّل ملف scripts/045_create_exam_schedules.sql أولاً.
                  </div>
                ) : isCircleDataLoading ? (
                  <div className="flex min-h-[180px] items-center justify-center rounded-[24px] border border-dashed border-[#d7e3f2] bg-[#fafcff]">
                    <SiteLoader />
                  </div>
                ) : studentScheduleRows.length > 0 ? (
                  <div className="overflow-x-auto rounded-[24px] border border-[#ebeff5]">
                    <Table className="min-w-[880px]">
                      <TableHeader>
                        <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc]">
                          <TableHead className="text-right font-black text-[#475569]">الطالب</TableHead>
                          <TableHead className="text-right font-black text-[#475569]">{portionUnitLabel}</TableHead>
                          <TableHead className="text-right font-black text-[#475569]">التاريخ</TableHead>
                          <TableHead className="text-right font-black text-[#475569]">الإجراء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentScheduleRows.map((row) => {
                          const isSending = sendingScheduleStudentId === row.student.id
                          const hasAvailablePortions = row.availablePortions.length > 0
                          const cannotSend = !row.draftPortionNumber || !row.draftExamDate
                          const actionLabel = isSending ? "" : "إرسال"

                          return (
                            <TableRow key={`schedule-row-${row.student.id}`}>
                              <TableCell className="text-right font-bold text-[#1f2937]">{row.student.name}</TableCell>
                              <TableCell className="text-right">
                                {hasAvailablePortions ? (
                                  <Select value={row.draftPortionNumber || undefined} onValueChange={(value) => updateScheduleDraft(row.student.id, { juzNumber: value })} dir="rtl">
                                    <SelectTrigger className="h-11 rounded-2xl border-[#d7e3f2] bg-white text-right">
                                      <SelectValue placeholder={`اختر ${portionUnitLabel}`} />
                                    </SelectTrigger>
                                    <SelectContent dir="rtl">
                                      {row.availablePortions.map((portion) => (
                                        <SelectItem key={`row-portion-${row.student.id}-${portion.portionType}-${portion.portionNumber}`} value={String(portion.portionNumber)}>{portion.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : row.scheduledCount > 0 ? (
                                  <div className="text-sm font-bold text-[#64748b]">تمت جدولة كل {portionUnitLabel === "الحزب" ? "الأحزاب" : "الأجزاء"} المتاحة</div>
                                ) : (
                                  <div className="text-sm font-bold text-[#64748b]">لا يوجد محفوظ</div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="date"
                                  value={row.draftExamDate}
                                  onChange={(event) => updateScheduleDraft(row.student.id, { examDate: event.target.value })}
                                  className="h-11 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold disabled:cursor-not-allowed disabled:opacity-70"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  onClick={() => handleSendScheduleNotification(row.student.id)}
                                  disabled={!hasAvailablePortions || isSending || cannotSend}
                                  className="h-11 w-[132px] rounded-2xl bg-[#3453a7] px-5 text-sm font-black text-white hover:bg-[#274187] disabled:bg-[#3453a7]/55 disabled:text-white disabled:opacity-100"
                                >
                                  {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : actionLabel}
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-[#d7e3f2] bg-white px-5 py-6 text-center text-sm font-black text-[#64748b]">
                    لا يوجد طلاب في الحلقة المختارة.
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {tableMissing ? (
            <div className="rounded-[28px] border border-amber-200 bg-white px-5 py-4 text-right text-sm font-bold leading-7 text-amber-800">
              جدول الاختبارات غير موجود بعد. شغّل ملف 042_create_student_exams.sql في قاعدة البيانات أولاً، ثم ستعمل الصفحة بشكل كامل.
            </div>
          ) : null}

          <Dialog open={isExamDialogOpen} onOpenChange={setIsExamDialogOpen}>
            <DialogContent className="top-3 w-[calc(100vw-24px)] max-w-3xl translate-y-0 overflow-hidden rounded-[28px] border border-[#dbe5f1] bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:top-[50%] sm:w-full sm:translate-y-[-50%]" showCloseButton={false}>
              <div className="flex flex-col overflow-hidden rounded-[28px] bg-white">
                <DialogHeader className="border-b border-[#e5edf6] px-4 py-4 sm:px-6 sm:py-5">
                  <DialogTitle className="flex items-center justify-start gap-2 text-left text-2xl font-black text-[#1a2332]">
                    <ClipboardCheck className="h-5 w-5 text-[#3453a7]" />
                    اختبار الطلاب
                  </DialogTitle>
                  <DialogDescription className="sr-only">نافذة اختيار الحلقة والطالب ثم تسجيل نتيجة الاختبار.</DialogDescription>
                </DialogHeader>

                <div className="px-4 py-5 sm:px-6 sm:py-6">
                  <div className="space-y-5">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 text-right">
                        <Label className="text-sm font-black text-[#334155]">الحلقة</Label>
                        <Select
                          value={examDialogCircle}
                          onValueChange={(value) => {
                            setExamDialogCircle(value)
                            setForm((current) => ({ ...current, studentId: "", selectedJuz: "", alertsCount: "0", mistakesCount: "0" }))
                          }}
                          dir="rtl"
                        >
                          <SelectTrigger className="h-11 rounded-2xl border-[#d7e3f2] bg-white">
                            <SelectValue placeholder="اختر الحلقة" />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            {circles.map((circle) => (
                              <SelectItem key={`exam-dialog-circle-${circle.id}`} value={circle.name}>{circle.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 text-right">
                        <Label className="text-sm font-black text-[#334155]">الطالب</Label>
                        <Select
                          key={examDialogCircle || "no-circle"}
                          value={form.studentId || undefined}
                          onValueChange={(value) => setForm((current) => ({ ...current, studentId: value, selectedJuz: "", alertsCount: "0", mistakesCount: "0" }))}
                          dir="rtl"
                          disabled={!examDialogCircle || isExamDialogLoading || examDialogFilteredStudents.length === 0}
                        >
                          <SelectTrigger className="h-11 rounded-2xl border-[#d7e3f2] bg-white disabled:cursor-not-allowed disabled:opacity-60">
                            <SelectValue placeholder={examDialogCircle ? (isExamDialogLoading ? "جاري تحميل الطلاب" : examDialogFilteredStudents.length > 0 ? "اختر الطالب" : "لا يوجد طلاب") : "اختر الحلقة أولاً"} />
                          </SelectTrigger>
                          <SelectContent dir="rtl">
                            {examDialogFilteredStudents.map((student) => (
                              <SelectItem key={`exam-dialog-student-${student.id}`} value={student.id}>{student.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="rounded-[30px] border border-[#dbe5f1] bg-[#fcfdff] p-5 shadow-[0_16px_45px_rgba(15,23,42,0.06)] sm:p-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2 text-right">
                          <Label className="text-sm font-black text-[#334155]">اسم المختبر</Label>
                          <Input value={form.testedByName} onChange={(event) => setForm((current) => ({ ...current, testedByName: event.target.value }))} placeholder="اكتب اسم المختبر" className="h-12 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold" />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-sm font-black text-[#334155]">{portionUnitLabel} المراد اختباره</Label>
                          <Select key={form.studentId || "no-student"} value={form.selectedJuz || undefined} onValueChange={(value) => setForm((current) => ({ ...current, selectedJuz: value }))} dir="rtl" disabled={!selectedStudent || isExamDialogLoading}>
                            <SelectTrigger className="h-12 rounded-2xl border-[#d7e3f2] bg-white">
                              <SelectValue placeholder={selectedStudent ? `اختر ${portionUnitLabel}` : "اختر الطالب أولاً"} />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                              {availablePortions.map((portion) => (
                                <SelectItem key={`${portion.portionType}-${portion.portionNumber}`} value={String(portion.portionNumber)}>{portion.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-sm font-black text-[#334155]">عدد الأخطاء</Label>
                          <Input type="number" min="0" value={form.mistakesCount} onChange={(event) => setForm((current) => ({ ...current, mistakesCount: event.target.value }))} className="h-12 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold" />
                        </div>

                        <div className="space-y-2 text-right">
                          <Label className="text-sm font-black text-[#334155]">عدد التنبيهات</Label>
                          <Input type="number" min="0" value={form.alertsCount} onChange={(event) => setForm((current) => ({ ...current, alertsCount: event.target.value }))} className="h-12 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold" />
                        </div>
                      </div>

                      {selectedStudent && eligiblePortionNumbers.length > 0 && availableJuzs.length === 0 ? (
                        <div className="mt-4 rounded-2xl bg-[#f8fbff] px-4 py-3 text-right text-sm font-bold text-[#20335f]">
                          كل المحفوظ المتاح لهذا الطالب تم اختباره فيه بالفعل.
                        </div>
                      ) : null}

                      {!selectedStudent && !isExamDialogLoading ? (
                        <div className="mt-4 rounded-2xl border border-dashed border-[#d7e3f2] px-4 py-4 text-right text-sm font-bold text-[#64748b]">
                          اختر الحلقة والطالب أولاً ليظهر {portionUnitLabel} المتاح للاختبار.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#e5edf6] px-4 py-4 sm:flex-row sm:px-6">
                  <Button type="button" variant="outline" onClick={() => setIsExamDialogOpen(false)} className="h-11 w-full rounded-2xl border-[#d7e3f2] bg-white px-5 text-sm font-black text-[#1a2332] hover:bg-[#f8fbff] sm:w-auto">
                    إغلاق
                  </Button>
                  <Button type="button" onClick={handleSaveExam} disabled={isSaving || isExamDialogLoading || tableMissing || !form.selectedJuz} className="h-11 w-full rounded-2xl bg-[#3453a7] px-6 text-sm font-black text-white hover:bg-[#274187] disabled:bg-[#3453a7] sm:w-auto">
                    {isSaving ? "جاري الحفظ..." : "حفظ الاختبار"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent className="top-3 max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-24px)] max-w-4xl translate-y-0 overflow-hidden rounded-[28px] border border-[#dbe5f1] bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:top-[50%] sm:w-full sm:translate-y-[-50%]" showCloseButton={false}>
              <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[28px] bg-white sm:max-h-[90vh]">
                <DialogHeader className="border-b border-[#e5edf6] px-6 py-5">
                  <div className="flex w-full flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <DialogTitle className="flex items-center justify-start gap-2 text-left text-2xl font-black text-[#1a2332]">
                      <SlidersHorizontal className="h-5 w-5 text-[#3453a7]" />
                      إعدادات الاختبارات
                    </DialogTitle>
                    <Button type="button" variant="outline" onClick={() => setIsTemplatesDialogOpen(true)} className="h-10 w-full rounded-2xl border-[#d7e3f2] bg-white px-4 text-sm font-black text-[#3453a7] hover:bg-[#f8fbff] sm:w-auto">
                      القوالب
                    </Button>
                  </div>
                </DialogHeader>

                <div className="grid gap-5 overflow-y-auto px-4 py-5 sm:grid-cols-2 sm:px-6 sm:py-6">
                  <div className="space-y-2 text-right">
                    <Label className="text-sm font-black text-[#334155]">وحدة الاختبار</Label>
                    <Select value={settingsForm.portionMode} onValueChange={handlePortionModeChange} dir="rtl">
                      <SelectTrigger className="h-11 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold">
                        <SelectValue placeholder="اختر وحدة الاختبار" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="juz">الأجزاء (30)</SelectItem>
                        <SelectItem value="hizb">الأحزاب (60)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 text-right">
                    <Label className="text-sm font-black text-[#334155]">أصل النقاط</Label>
                    <Input type="number" min="1" value={settingsForm.maxScore} onChange={(event) => handleSettingsChange("maxScore", event.target.value)} className="h-11 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Label className="text-sm font-black text-[#334155]">حد النجاح</Label>
                    <Input type="number" min="0" value={settingsForm.minPassingScore} onChange={(event) => handleSettingsChange("minPassingScore", event.target.value)} className="h-11 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Label className="text-sm font-black text-[#334155]">خصم التنبيه الواحد</Label>
                    <Input type="number" min="0" step="0.5" value={settingsForm.alertDeduction} onChange={(event) => handleSettingsChange("alertDeduction", event.target.value)} className="h-11 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold" />
                  </div>
                  <div className="space-y-2 text-right">
                    <Label className="text-sm font-black text-[#334155]">خصم الخطأ الواحد</Label>
                    <Input type="number" min="0" step="0.5" value={settingsForm.mistakeDeduction} onChange={(event) => handleSettingsChange("mistakeDeduction", event.target.value)} className="h-11 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold" />
                  </div>
                </div>

                <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#e5edf6] px-4 py-4 sm:flex-row sm:px-6">
                  <Button type="button" variant="outline" onClick={() => setIsSettingsOpen(false)} className="h-11 w-full rounded-2xl border-[#d7e3f2] bg-white px-5 text-sm font-black text-[#1a2332] hover:bg-[#f8fbff] sm:w-auto">
                    إغلاق
                  </Button>
                  <Button type="button" onClick={handleSaveSettings} disabled={isSavingSettings} className="h-11 w-full rounded-2xl bg-[#3453a7] px-6 text-sm font-black text-white hover:bg-[#274187] disabled:bg-[#3453a7] sm:w-auto">
                    <Save className="me-2 h-4 w-4" />
                    {isSavingSettings ? "جاري الحفظ..." : "حفظ الإعدادات"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isTemplatesDialogOpen} onOpenChange={setIsTemplatesDialogOpen}>
            <DialogContent onOpenAutoFocus={(event) => event.preventDefault()} className="top-3 max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-24px)] max-w-4xl translate-y-0 overflow-hidden rounded-[28px] border border-[#dbe5f1] bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:top-[50%] sm:w-full sm:translate-y-[-50%]" showCloseButton={false}>
              <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[28px] bg-white sm:max-h-[90vh]">
                <DialogHeader className="border-b border-[#e5edf6] px-6 py-5">
                  <DialogTitle className="flex w-full items-center justify-start gap-2 text-left text-2xl font-black text-[#1a2332]">
                    <BellRing className="h-5 w-5 text-[#3453a7]" />
                    قوالب الاختبارات
                  </DialogTitle>
                </DialogHeader>

                <div className="overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                  <div className="mb-4 space-y-1 text-right">
                    <div className="flex items-center justify-start gap-2">
                      <h3 className="text-base font-black text-[#1a2332]">قوالب التنبيه والرسائل</h3>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#d7e3f2] bg-[#f8fbff] text-[#3453a7] transition-colors hover:bg-[#eef4ff]" aria-label="المتغيرات المتاحة في قوالب التنبيه والرسائل">
                            <CircleAlert className="h-3.5 w-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="left" sideOffset={8} className="max-w-sm rounded-xl bg-[#1a2332] px-4 py-3 text-right text-xs leading-6 text-white">
                          المتغيرات المتاحة: <span className="font-bold">{'{name}'}</span> اسم الطالب، <span className="font-bold">{'{portion}'}</span> الجزء أو النطاق، <span className="font-bold">{'{date}'}</span> التاريخ، <span className="font-bold">{'{halaqah}'}</span> اسم الحلقة، <span className="font-bold">{'{score}'}</span> الدرجة، <span className="font-bold">{'{max_score}'}</span> أصل الدرجة، <span className="font-bold">{'{status}'}</span> الحالة، <span className="font-bold">{'{tested_by}'}</span> المختبر، <span className="font-bold">{'{notes}'}</span> الملاحظات.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-slate-500">يتم الإرسال للطالب عبر المنصة، ولولي الأمر عبر الواتس.</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2 text-right">
                      <Label className="text-sm font-black text-[#334155]">قالب إنشاء الموعد</Label>
                      <Textarea value={notificationTemplatesForm.create} onChange={(event) => handleNotificationTemplateChange("create", event.target.value)} className="min-h-[88px] rounded-2xl border-[#d7e3f2] bg-white text-sm leading-6" />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label className="text-sm font-black text-[#334155]">قالب تعديل الموعد</Label>
                      <Textarea value={notificationTemplatesForm.update} onChange={(event) => handleNotificationTemplateChange("update", event.target.value)} className="min-h-[88px] rounded-2xl border-[#d7e3f2] bg-white text-sm leading-6" />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label className="text-sm font-black text-[#334155]">قالب إلغاء الموعد</Label>
                      <Textarea value={notificationTemplatesForm.cancel} onChange={(event) => handleNotificationTemplateChange("cancel", event.target.value)} className="min-h-[88px] rounded-2xl border-[#d7e3f2] bg-white text-sm leading-6" />
                    </div>
                    <div className="space-y-2 text-right">
                      <Label className="text-sm font-black text-[#334155]">قالب نتيجة التقييم</Label>
                      <Textarea value={notificationTemplatesForm.result} onChange={(event) => handleNotificationTemplateChange("result", event.target.value)} className="min-h-[88px] rounded-2xl border-[#d7e3f2] bg-white text-sm leading-6" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse justify-end gap-3 border-t border-[#e5edf6] px-4 py-4 sm:flex-row sm:px-6">
                  <Button type="button" variant="outline" onClick={() => setIsTemplatesDialogOpen(false)} className="h-11 w-full rounded-2xl border-[#d7e3f2] bg-white px-5 text-sm font-black text-[#1a2332] hover:bg-[#f8fbff] sm:w-auto">
                    إغلاق
                  </Button>
                  <Button type="button" onClick={handleSaveTemplates} disabled={isSavingTemplates} className="h-11 w-full rounded-2xl bg-[#3453a7] px-6 text-sm font-black text-white hover:bg-[#274187] disabled:bg-[#3453a7] sm:w-auto">
                    <Save className="me-2 h-4 w-4" />
                    {isSavingTemplates ? "جاري الحفظ..." : "حفظ القوالب"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isSchedulesOverviewOpen} onOpenChange={setIsSchedulesOverviewOpen}>
            <DialogContent className="top-3 max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-24px)] max-w-4xl translate-y-0 overflow-hidden rounded-[28px] border border-[#dbe5f1] bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:top-[50%] sm:max-h-[90vh] sm:w-full sm:translate-y-[-50%]" showCloseButton={false}>
              <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[28px] bg-white sm:max-h-[90vh]">
                <DialogHeader className="border-b border-[#e5edf6] px-4 py-4 sm:px-6 sm:py-5">
                  <DialogTitle className="flex w-full items-center justify-start gap-2 text-left text-2xl font-black text-[#1a2332]">
                    <CalendarDays className="h-5 w-5 text-[#3453a7]" />
                    المواعيد
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 text-right">
                      <Label className="text-sm font-black text-[#334155]">الحلقة</Label>
                      <Select value={overviewCircleFilter} onValueChange={setOverviewCircleFilter} dir="rtl">
                        <SelectTrigger className="h-11 rounded-2xl border-[#d7e3f2] bg-white">
                          <SelectValue placeholder="اختر الحلقة" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          <SelectItem value={ALL_CIRCLES_VALUE}>جميع الحلقات</SelectItem>
                          {circles.map((circle) => (
                            <SelectItem key={`overview-circle-${circle.id}`} value={circle.name}>{circle.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 text-right">
                      <Label className="text-sm font-black text-[#334155]">التاريخ</Label>
                      <Input type="date" value={overviewDateFilter} onChange={(event) => setOverviewDateFilter(event.target.value)} className="h-11 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold" />
                    </div>
                  </div>

                  {overviewSchedulesTableMissing ? (
                    <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-right text-sm font-bold leading-7 text-amber-800">
                      جدول مواعيد الاختبارات غير موجود بعد. شغّل ملف scripts/045_create_exam_schedules.sql أولاً.
                    </div>
                  ) : isOverviewSchedulesLoading ? (
                    <div className="flex min-h-[220px] items-center justify-center">
                      <SiteLoader />
                    </div>
                  ) : !overviewDateFilter ? (
                    <div className="rounded-[24px] border border-dashed border-[#d7e3f2] px-4 py-8 text-center text-sm font-bold text-[#7b8794]">
                      اختر التاريخ لعرض الطلاب الذين لديهم موعد في هذا اليوم.
                    </div>
                  ) : overviewDateSchedules.length > 0 ? (
                    <div className="space-y-3">
                      {paginatedOverviewSchedules.map((schedule) => {
                        const student = normalizeScheduleStudentRelation(schedule.students)
                        const isOverdue = isScheduleOverdue(schedule)

                        return (
                          <div key={`overview-schedule-${schedule.id}`} className="rounded-[24px] border border-[#e5edf6] px-4 py-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="space-y-1 text-right">
                                <div className="text-base font-black text-[#1a2332]">{student?.name || "طالب"}</div>
                                <div className="text-sm font-semibold text-[#475569]">{schedule.exam_portion_label}</div>
                                {isOverdue ? (
                                  <div className="text-sm font-black text-amber-600">فائت</div>
                                ) : null}
                              </div>

                              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
                                <Button type="button" variant="outline" onClick={() => handleCancelSchedule(schedule.id, schedule.student_id)} disabled={isCancellingScheduleId === schedule.id} className="h-9 min-w-[96px] flex-1 rounded-xl border-[#fee2e2] bg-white px-3 text-xs font-black text-[#b91c1c] hover:bg-[#fff7f7] hover:text-[#b91c1c] disabled:opacity-60 sm:flex-none">
                                  <Trash2 className="me-1.5 h-3.5 w-3.5" />
                                  {isCancellingScheduleId === schedule.id ? "جاري الإلغاء..." : "إلغاء"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}

                      <div className="flex items-center justify-center gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOverviewPage((current) => Math.max(1, current - 1))} disabled={overviewPage === 1} className="h-10 w-10 rounded-full border-[#d7e3f2] bg-white p-0 text-[#1a2332] hover:bg-[#f8fbff] disabled:opacity-50">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <div className="min-w-[88px] text-center text-sm font-black text-[#475569]">
                          {overviewPage} / {overviewPageCount}
                        </div>
                        <Button type="button" variant="outline" onClick={() => setOverviewPage((current) => Math.min(overviewPageCount, current + 1))} disabled={overviewPage >= overviewPageCount} className="h-10 w-10 rounded-full border-[#d7e3f2] bg-white p-0 text-[#1a2332] hover:bg-[#f8fbff] disabled:opacity-50">
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-[#d7e3f2] px-4 py-8 text-center text-sm font-bold text-[#7b8794]">
                      لا توجد مواعيد اختبارات في التاريخ المحدد.
                    </div>
                  )}
                </div>

                <div className="flex justify-end border-t border-[#e5edf6] px-4 py-4 sm:px-6">
                  <Button type="button" variant="outline" onClick={() => setIsSchedulesOverviewOpen(false)} className="h-11 rounded-2xl border-[#d7e3f2] bg-white px-5 text-sm font-black text-[#1a2332] hover:bg-[#f8fbff]">
                    إغلاق
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isFailedExamActionDialogOpen} onOpenChange={setIsFailedExamActionDialogOpen}>
            <DialogContent className="top-3 max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-24px)] max-w-xl translate-y-0 overflow-hidden rounded-[28px] border border-[#dbe5f1] bg-white p-0 shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:top-[50%] sm:w-full sm:translate-y-[-50%]" showCloseButton={false}>
              <div className="flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[28px] bg-white">
                <DialogHeader className="border-b border-[#e5edf6] px-6 py-5">
                  <DialogTitle className="flex w-full items-center justify-start gap-2 text-left text-2xl font-black text-[#1a2332]">
                    <CircleAlert className="h-5 w-5 text-[#3453a7]" />
                    معالجة الرسوب
                  </DialogTitle>
                  <DialogDescription className="pt-2 text-right text-sm font-semibold leading-7 text-[#64748b]">
                    الطالب راسب في هذا {portionUnitLabel}. هل تريد إعادة حفظه أم تجدوله على موعد آخر لإعادة اختباره؟
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 overflow-y-auto px-6 py-6">
                  <div className="space-y-2 text-right">
                    <Label className="text-sm font-black text-[#334155]">ماذا تريد بعد الرسوب؟</Label>
                    <Select value={failedExamActionForm.action} onValueChange={(value) => setFailedExamActionForm((current) => ({ ...current, action: value === "rememorize" ? "rememorize" : "retest" }))} dir="rtl">
                      <SelectTrigger className="h-11 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold">
                        <SelectValue placeholder="اختر الإجراء" />
                      </SelectTrigger>
                      <SelectContent dir="rtl">
                        <SelectItem value="retest">تحديد موعد آخر لإعادة الاختبار</SelectItem>
                        <SelectItem value="rememorize">إعادة الحفظ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {failedExamActionForm.action === "retest" ? (
                    <div className="space-y-2 text-right">
                      <Label className="text-sm font-black text-[#334155]">موعد إعادة الاختبار</Label>
                      <Input type="date" value={failedExamActionForm.retestDate} onChange={(event) => setFailedExamActionForm((current) => ({ ...current, retestDate: event.target.value }))} className="h-11 rounded-2xl border-[#d7e3f2] bg-white text-base font-bold" />
                    </div>
                  ) : (
                    <p className="text-right text-sm font-bold leading-7 text-[#dc2626]">
                      عند اختيار إعادة الحفظ سيتم حذف هذا {portionUnitLabel} من المحفوظ الحالي، ولن يبقى محسوبًا ضمن الخطة الجارية، وسيظهر لاحقًا كجزء يحتاج إلى إتقان عند إضافة خطة جديدة للطالب.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 border-t border-[#e5edf6] px-6 py-4">
                  <Button type="button" variant="outline" onClick={() => setIsFailedExamActionDialogOpen(false)} className="h-11 rounded-2xl border-[#d7e3f2] bg-white px-5 text-sm font-black text-[#1a2332] hover:bg-[#f8fbff]">
                    إغلاق
                  </Button>
                  <Button type="button" onClick={handleConfirmFailedExamAction} disabled={isSaving} className="h-11 rounded-2xl bg-[#3453a7] px-6 text-sm font-black text-white hover:bg-[#274187] disabled:bg-[#3453a7]">
                    {isSaving ? "جاري الحفظ..." : "حفظ فقط"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <Footer />
    </div>
  )
}