"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpenCheck, CalendarDays, Check, Clock3, FileWarning } from "lucide-react"

import { Footer } from "@/components/footer"
import { Header } from "@/components/header"
import { SiteLoader } from "@/components/ui/site-loader"
import { useVerifiedRoleAccess } from "@/hooks/use-verified-role-access"
import type { ExamPortionType } from "@/lib/exam-portion-settings"
import { buildExamPortionRecordMap, getPassedPortionNumbers } from "@/lib/exam-portions"
import type { PreviousMemorizationRange } from "@/lib/quran-data"
import { formatExamPortionLabel, getEligibleExamPortions, type StudentExamPlanProgressSource } from "@/lib/student-exams"

type StudentData = {
  id: string
  name: string
  halaqah: string
  account_number: number
  completed_juzs?: number[]
  current_juzs?: number[]
  memorized_ranges?: PreviousMemorizationRange[] | null
  memorized_start_surah?: number | null
  memorized_start_verse?: number | null
  memorized_end_surah?: number | null
  memorized_end_verse?: number | null
}

type StudentExamRecord = {
  id: string
  exam_portion_label: string
  portion_type?: ExamPortionType | null
  portion_number?: number | null
  juz_number: number | null
  exam_date: string
  alerts_count?: number
  mistakes_count?: number
  final_score: number
  passed: boolean
  tested_by_name?: string | null
}

type StudentPlanResponse = {
  plan: StudentExamPlanProgressSource | null
  completedDays: number
}

type StudentExamSchedule = {
  id: string
  exam_portion_label: string
  portion_type?: ExamPortionType | null
  portion_number?: number | null
  juz_number: number
  exam_date: string
  status: "scheduled" | "completed" | "cancelled"
}

const SITE_ICON_GRADIENT = "linear-gradient(135deg, #0f2f6d 0%, #1f4d9a 55%, #3667b2 100%)"

function getExamPortionDisplay(exam?: Pick<StudentExamRecord, "exam_portion_label" | "juz_number"> | null) {
  if (!exam) {
    return "-"
  }

  if (exam.exam_portion_label?.trim()) {
    return exam.exam_portion_label
  }

  return exam.juz_number ? `الجزء ${exam.juz_number}` : "-"
}

function getPortionNumber(record?: { portion_number?: number | null; juz_number?: number | null } | null) {
  return Number(record?.portion_number || record?.juz_number || 0)
}

function getNormalizedPortionLabel(
  record: { exam_portion_label?: string | null; portion_type?: ExamPortionType | null; portion_number?: number | null; juz_number?: number | null } | null | undefined,
  fallbackMode: ExamPortionType,
) {
  if (!record) {
    return "-"
  }

  const portionType = record.portion_type === "hizb" ? "hizb" : fallbackMode
  const portionNumber = getPortionNumber(record)

  if (portionNumber > 0) {
    return formatExamPortionLabel(portionNumber, record.exam_portion_label || "-", portionType)
  }

  return record.exam_portion_label?.trim() || "-"
}

export default function StudentExamsPage() {
  const { isLoading: authLoading, isAuthorized, user } = useVerifiedRoleAccess(["student"])

  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const [studentExams, setStudentExams] = useState<StudentExamRecord[]>([])
  const [studentSchedules, setStudentSchedules] = useState<StudentExamSchedule[]>([])
  const [planProgress, setPlanProgress] = useState<StudentPlanResponse | null>(null)
  const [portionMode, setPortionMode] = useState<ExamPortionType>("juz")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      return
    }

    async function loadData() {
      try {
        const studentResponse = await fetch(`/api/students?account_number=${user.accountNumber}`, { cache: "no-store" })
        const studentPayload = await studentResponse.json()
        const student = (studentPayload.students || [])[0] as StudentData | undefined

        if (!student) {
          setStudentData(null)
          setStudentExams([])
          setStudentSchedules([])
          setPlanProgress(null)
          return
        }

        setStudentData(student)

        const [examsResponse, planResponse, schedulesResponse] = await Promise.all([
          fetch("/api/exams", { cache: "no-store" }),
          fetch(`/api/student-plans?student_id=${student.id}`, { cache: "no-store" }),
          fetch(`/api/exam-schedules?student_id=${student.id}`, { cache: "no-store" }),
        ])

        const examsPayload = await examsResponse.json()
        const planPayload = await planResponse.json()
        const schedulesPayload = await schedulesResponse.json()

        setStudentExams((examsPayload.exams || []) as StudentExamRecord[])
        setStudentSchedules((schedulesPayload.schedules || []) as StudentExamSchedule[])
        setPortionMode((examsPayload.portionSettings?.mode || schedulesPayload.portionSettings?.mode || "juz") as ExamPortionType)
        setPlanProgress({
          plan: (planPayload.plan || null) as StudentExamPlanProgressSource | null,
          completedDays: Number(planPayload.completedDays) || 0,
        })
      } catch (error) {
        console.error("[student-exams] load:", error)
        setStudentData(null)
        setStudentExams([])
        setStudentSchedules([])
        setPlanProgress(null)
      } finally {
        setIsLoading(false)
      }
    }

    void loadData()
  }, [user])

  const latestExamByPortion = useMemo(() => buildExamPortionRecordMap(studentExams, portionMode), [studentExams, portionMode])

  const memorizedPortions = useMemo(() => getEligibleExamPortions(studentData, planProgress, portionMode), [studentData, planProgress, portionMode])
  const memorizedPortionNumbers = useMemo(() => memorizedPortions.map((portion) => portion.portionNumber), [memorizedPortions])
  const memorizedPortionLabels = useMemo(() => new Map(memorizedPortions.map((portion) => [portion.portionNumber, portion.label])), [memorizedPortions])
  const scheduledPortionNumbers = useMemo(() => studentSchedules.filter((schedule) => schedule.status === "scheduled").map((schedule) => getPortionNumber(schedule)).filter((portionNumber) => portionNumber > 0), [studentSchedules])
  const displayedJuzs = useMemo(() => {
    const testedPortions = Array.from(latestExamByPortion.keys())
    return Array.from(new Set([...memorizedPortionNumbers, ...scheduledPortionNumbers, ...testedPortions])).sort((left, right) => left - right)
  }, [memorizedPortionNumbers, scheduledPortionNumbers, latestExamByPortion])

  const passedPortionNumbers = useMemo(() => getPassedPortionNumbers(studentExams, portionMode), [studentExams, portionMode])
  const passedCount = displayedJuzs.filter((portionNumber) => passedPortionNumbers.has(portionNumber)).length
  const failedCount = displayedJuzs.filter((portionNumber) => {
    const exam = latestExamByPortion.get(portionNumber)
    return exam?.passed === false && !passedPortionNumbers.has(portionNumber)
  }).length
  const untestedCount = Math.max(0, displayedJuzs.length - passedCount - failedCount)
  const testedCount = passedCount + failedCount
  const progressPercentage = displayedJuzs.length > 0 ? Math.round((testedCount / displayedJuzs.length) * 100) : 0
  const todaySaudiDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date())
  const upcomingSchedule = useMemo(() => {
    return [...studentSchedules]
      .filter((schedule) => schedule.status === "scheduled" && schedule.exam_date >= todaySaudiDate)
      .sort((left, right) => left.exam_date.localeCompare(right.exam_date))[0] || null
  }, [studentSchedules, todaySaudiDate])
  const scheduledExamByJuz = useMemo(() => {
    const entries = new Map<number, StudentExamSchedule>()
    for (const schedule of studentSchedules) {
      const portionNumber = Number(schedule.portion_number || schedule.juz_number)
      if (schedule.status !== "scheduled" || entries.has(portionNumber)) continue
      entries.set(portionNumber, schedule)
    }
    return entries
  }, [studentSchedules])
  const portionUnitPluralLabel = portionMode === "hizb" ? "أحزاب" : "أجزاء"

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9]">
        <SiteLoader size="lg" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-white" dir="rtl">
      <Header />

      <main className="flex-1 py-6 md:py-12 px-3 md:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 text-center md:mb-12">
            <div className="mb-3 flex items-center justify-center gap-2 md:mb-4 md:gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl shadow-[0_10px_24px_rgba(15,47,109,0.20)] md:h-12 md:w-12"
                style={{ background: SITE_ICON_GRADIENT }}
              >
                <BookOpenCheck className="h-5 w-5 text-white md:h-6 md:w-6" />
              </div>
              <h1 className="inline-block bg-gradient-to-r from-[#0f2f6d] via-[#1f4d9a] to-[#3667b2] bg-clip-text pb-1 text-3xl font-bold leading-[1.2] text-transparent md:text-5xl">
                الاختبارات
              </h1>
            </div>
          </div>

          <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f2f6d] via-[#1f4d9a] to-[#7db7ff] p-6 text-white shadow-2xl md:mb-12 md:rounded-3xl md:p-10">
            <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 translate-x-1/4 -translate-y-1/2 rounded-full bg-[#cfe0ff]/14" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-36 w-36 -translate-x-1/4 translate-y-1/2 rounded-full bg-[#dce9ff]/12" />

            <div className="relative z-10 grid grid-cols-1 items-center gap-6 md:grid-cols-3 md:gap-10">
              <div className="md:col-span-3">
                <div className="mb-4 flex items-center">
                  <p className="text-sm font-bold tracking-wide opacity-90 md:text-base">التقدم في الإختبارات</p>
                </div>

                <div className="relative h-7 overflow-hidden rounded-full border border-white/14 bg-[#153874]/55 shadow-inner md:h-9">
                  <div
                    className="absolute right-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${progressPercentage}%`,
                      background: "linear-gradient(90deg, #3453a7 0%, #4f73d1 52%, #6ea7f5 100%)",
                      boxShadow: "0 0 18px 3px rgba(79,115,209,0.26)",
                    }}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent" />
                  </div>

                  {[25, 50, 75].map((milestone) => (
                    <div
                      key={milestone}
                      className="absolute bottom-1 top-1 w-px bg-white/18"
                      style={{ right: `${100 - milestone}%` }}
                    />
                  ))}
                </div>

                <div className="mt-2 flex justify-between px-1">
                  {[0, 25, 50, 75, 100].map((milestone) => (
                    <span key={milestone} className="text-[10px] font-semibold text-[#f5f9ff] md:text-xs">
                      {milestone}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {upcomingSchedule ? (
            <div className="mb-8 rounded-[28px] border border-[#d7e3f2] bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)] md:mb-10 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 text-[#3453a7]">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-xl shadow-[0_8px_20px_rgba(15,47,109,0.16)]"
                      style={{ background: SITE_ICON_GRADIENT }}
                    >
                      <CalendarDays className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-black">تم تحديد موعد اختبارك</span>
                  </div>
                  <div className="mt-2 text-xl font-black text-[#1a2332]">{getNormalizedPortionLabel(upcomingSchedule, portionMode)}</div>
                </div>

                <div className="rounded-2xl bg-[#f5f8ff] px-5 py-4 text-right">
                  <div className="text-xs font-bold text-[#64748b]">التاريخ</div>
                  <div className="mt-1 text-lg font-black text-[#0f2f6d]">{upcomingSchedule.exam_date}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-8 rounded-[28px] border border-[#d7e3f2] bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)] md:mb-10 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 text-[#64748b]">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#eef2f7]"
                    >
                      <CalendarDays className="h-4 w-4 text-[#64748b]" />
                    </div>
                    <span className="text-sm font-black">لا يوجد لديك موعد اختبار</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-[#64748b]">سيظهر هنا مباشرة عند تحديد موعد جديد لك.</div>
                </div>
              </div>
            </div>
          )}

          {displayedJuzs.length === 0 ? (
            <div className="rounded-[26px] border border-[#dce7f7] bg-white px-6 py-14 text-center shadow-sm">
              <div
                className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[26px] shadow-[0_14px_34px_rgba(15,47,109,0.18)]"
                style={{ background: SITE_ICON_GRADIENT }}
              >
                <BookOpenCheck className="h-10 w-10 text-white" />
              </div>
              <p className="text-xl font-black text-[#1f2937]">لا توجد {portionUnitPluralLabel} اختبار ظاهرة بعد</p>
              <p className="mt-2 text-sm font-semibold text-[#6b7280]">حالما يكتمل جزء للحفظ أو تُسجل عليه نتيجة اختبار، سيظهر هنا مباشرة.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 md:gap-6">
              {displayedJuzs.map((juzNumber) => {
                const latestExam = latestExamByPortion.get(juzNumber)
                const scheduledExam = scheduledExamByJuz.get(juzNumber)
                const isPassed = passedPortionNumbers.has(juzNumber)
                const isFailed = latestExam?.passed === false && !isPassed
                const portionLabel = memorizedPortionLabels.get(juzNumber) || getNormalizedPortionLabel(latestExam || scheduledExam, portionMode) || getExamPortionDisplay(latestExam)

                const topBar = isPassed
                  ? "linear-gradient(90deg, #16a34a, #86efac, #16a34a)"
                  : isFailed
                    ? "linear-gradient(90deg, #dc2626, #fca5a5, #dc2626)"
                    : "linear-gradient(90deg, #3453a7, #7db7ff)"

                const outerBackground = isPassed
                  ? "linear-gradient(160deg, #effaf1 0%, #e4f9e8 100%)"
                  : isFailed
                    ? "linear-gradient(160deg, #fff5f5 0%, #ffe8e8 100%)"
                    : "linear-gradient(160deg, #ffffff 0%, #f7faff 100%)"

                const outerBorder = isPassed
                  ? "1.5px solid rgba(34,197,94,0.28)"
                  : isFailed
                    ? "1.5px solid rgba(239,68,68,0.22)"
                    : "1.5px solid rgba(52,83,167,0.24)"

                return (
                  <div
                    key={juzNumber}
                    className="group relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                    style={{
                      background: outerBackground,
                      border: outerBorder,
                      boxShadow: "0 2px 12px rgba(52,83,167,0.08)",
                    }}
                  >
                    <div className="h-1 w-full" style={{ background: topBar }} />

                    <div className="flex flex-1 flex-col p-5 md:p-6">
                      <div className="mb-3 flex justify-start">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-black text-white md:h-14 md:w-14 md:text-2xl"
                          style={{
                            background: isPassed
                              ? "linear-gradient(145deg, #4ade80, #16a34a)"
                              : isFailed
                                ? "linear-gradient(145deg, #f87171, #dc2626)"
                                : "linear-gradient(145deg, #7db7ff, #3453a7)",
                            boxShadow: "0 2px 8px rgba(52,83,167,0.22)",
                          }}
                        >
                          {juzNumber}
                        </div>
                      </div>

                      <h3 className="text-base font-bold leading-tight text-[#1a2332] md:text-lg">{portionLabel}</h3>

                      <div className="mt-auto pt-4">
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[#64748b]">
                          {isPassed ? <Check className="h-3.5 w-3.5 text-[#16a34a]" /> : isFailed ? <FileWarning className="h-3.5 w-3.5 text-[#dc2626]" /> : <Clock3 className="h-3.5 w-3.5 text-[#3453a7]" />}
                          <span>
                            {latestExam?.exam_date
                              ? new Date(latestExam.exam_date).toLocaleDateString("ar-SA")
                              : scheduledExam?.exam_date
                                ? `تم تحديده ${new Date(scheduledExam.exam_date).toLocaleDateString("ar-SA")}`
                                : "لا يوجد لديك موعد اختبار"}
                          </span>
                        </div>

                        <div className="w-full rounded-lg border border-black/5 bg-white/80 px-3 py-3 text-right">
                          <div className="text-[11px] font-bold text-[#64748b]">النتيجة</div>
                          <div className={`mt-1 text-sm font-black ${isPassed ? "text-[#166534]" : isFailed ? "text-[#b91c1c]" : "text-[#3453a7]"}`}>
                            {isPassed ? `ناجح بدرجة ${latestExam?.final_score ?? 0}` : isFailed ? "راسب" : scheduledExam ? "تم تحديده" : "لم يتم الاختبار"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}