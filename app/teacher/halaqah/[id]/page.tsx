"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, RotateCcw, MessageSquare, Plus, CircleAlert } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useAlertDialog } from "@/hooks/use-confirm-dialog"
import { SiteLoader } from "@/components/ui/site-loader"
import { formatQuranRange, getActivePlanDayNumber, getPlanSessionContent, getPlanSupportSessionContent, resolvePlanTotalDays, resolvePlanTotalPages, SURAHS } from "@/lib/quran-data"
import { type AttendanceStatus, isEvaluatedAttendance, isNonEvaluatedAttendance } from "@/lib/student-attendance"
import { getHafizExtraLabel, getHafizExtraPoints, HAFIZ_EXTRA_PAGE_VALUES, normalizeHafizExtraPages, type HafizExtraPages } from "@/lib/hafiz-extra"

type EvaluationLevel = "excellent" | "very_good" | "good" | "not_completed" | null
type EvaluationType = "hafiz" | "tikrar" | "samaa" | "rabet"
type ContentfulEvaluationType = "hafiz" | "samaa" | "rabet"

const attendanceOptions: Array<{ value: AttendanceStatus; label: string }> = [
	{ value: "present", label: "حاضر" },
	{ value: "late", label: "متأخر" },
	{ value: "absent", label: "غائب" },
	{ value: "excused", label: "مستأذن" },
]

const evaluationOptions: Array<{ value: Exclude<EvaluationLevel, null>; label: string }> = [
	{ value: "excellent", label: "ممتاز" },
	{ value: "very_good", label: "جيد جدًا" },
	{ value: "good", label: "جيد" },
	{ value: "not_completed", label: "لم يكمل" },
]

interface EvaluationContent {
	text?: string
	fromSurah?: string
	fromVerse?: string
	toSurah?: string
	toVerse?: string
}

type ReadingDetails = Partial<Record<ContentfulEvaluationType, EvaluationContent>>

interface EvaluationOption {
	hafiz?: EvaluationLevel
	tikrar?: EvaluationLevel
	samaa?: EvaluationLevel
	rabet?: EvaluationLevel
}

interface StudentAttendance {
	id: string
	name: string
	halaqah: string
	hasPlan: boolean
	attendance: AttendanceStatus | null
	evaluation?: EvaluationOption
	readingDetails?: ReadingDetails
	planReadingDetails?: ReadingDetails
	notes?: string
	hafizExtraPages?: HafizExtraPages | null
	savedToday?: boolean
}

interface SavedAttendanceRecord {
	student_id: string
	status: AttendanceStatus
	hafiz_level?: EvaluationLevel
	tikrar_level?: EvaluationLevel
	samaa_level?: EvaluationLevel
	rabet_level?: EvaluationLevel
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
	hafiz_extra_pages?: number | null
}

interface MissedDayRecord {
	date: string
	sessionIndex: number
	content: string
	hafiz_from_surah?: string
	hafiz_from_verse?: string
	hafiz_to_surah?: string
	hafiz_to_verse?: string
}

interface StudentPlan {
	student_id: string
	start_surah_number: number
	start_verse?: number | null
	end_surah_number: number
	end_verse?: number | null
	daily_pages: number
	total_pages: number
	total_days: number
	direction?: "asc" | "desc"
	has_previous?: boolean
	prev_start_surah?: number | null
	prev_start_verse?: number | null
	prev_end_surah?: number | null
	prev_end_verse?: number | null
	completed_juzs?: number[] | null
	muraajaa_pages?: number | null
	rabt_pages?: number | null
	start_date?: string | null
	created_at?: string | null
}

interface PlanProgressResponse {
	plan: StudentPlan | null
	completedDays?: number
	hafizExtraPages?: number
}

// دالة للحصول على التاريخ الحالي بتوقيت السعودية (بصيغة YYYY-MM-DD)
const getKsaDateString = () => {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Asia/Riyadh",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})
	const parts = formatter.formatToParts(new Date())
	const year = parts.find((part) => part.type === "year")?.value
	const month = parts.find((part) => part.type === "month")?.value
	const day = parts.find((part) => part.type === "day")?.value

	return `${year}-${month}-${day}`
}

const getPlanReadingDetails = (plan: StudentPlan | null, completedDays: number, hafizExtraPages?: number | null): ReadingDetails => {
	if (!plan) return {}

	const totalDays = resolvePlanTotalDays(plan)
	const activeDayNum = getActivePlanDayNumber(totalDays, completedDays, plan.start_date, plan.created_at)

	const hafiz = getPlanSessionContent(plan, activeDayNum, hafizExtraPages)
	const supportContent = getPlanSupportSessionContent(plan, completedDays, undefined, hafizExtraPages)
	const samaa = supportContent.muraajaa
	const rabet = supportContent.rabt

	return {
		...(hafiz ? { hafiz } : {}),
		...(samaa ? { samaa } : {}),
		...(rabet ? { rabet } : {}),
	}
}

const formatReadingDetails = (details?: EvaluationContent | null) => {
	if (details?.text?.trim()) {
		return details.text
	}

	return formatQuranRange(details?.fromSurah, details?.fromVerse, details?.toSurah, details?.toVerse)
}

const buildSavedReadingDetails = (record: SavedAttendanceRecord): ReadingDetails => {
	const readingDetails: ReadingDetails = {}

	if (record.hafiz_from_surah && record.hafiz_from_verse && record.hafiz_to_surah && record.hafiz_to_verse) {
		readingDetails.hafiz = {
			fromSurah: record.hafiz_from_surah,
			fromVerse: record.hafiz_from_verse,
			toSurah: record.hafiz_to_surah,
			toVerse: record.hafiz_to_verse,
		}
	}

	if (record.samaa_from_surah && record.samaa_from_verse && record.samaa_to_surah && record.samaa_to_verse) {
		readingDetails.samaa = {
			fromSurah: record.samaa_from_surah,
			fromVerse: record.samaa_from_verse,
			toSurah: record.samaa_to_surah,
			toVerse: record.samaa_to_verse,
		}
	}

	if (record.rabet_from_surah && record.rabet_from_verse && record.rabet_to_surah && record.rabet_to_verse) {
		readingDetails.rabet = {
			fromSurah: record.rabet_from_surah,
			fromVerse: record.rabet_from_verse,
			toSurah: record.rabet_to_surah,
			toVerse: record.rabet_to_verse,
		}
	}

	return readingDetails
}

const hasCompleteSavedRecord = (record: SavedAttendanceRecord, student: StudentAttendance) => {
	if (!isEvaluatedAttendance(record.status)) return true
	if (!student.hasPlan) return false

	return !!(
		record.hafiz_level &&
		record.tikrar_level &&
		record.samaa_level &&
		record.rabet_level
	)
}

const mergeSavedAttendance = (student: StudentAttendance, record?: SavedAttendanceRecord): StudentAttendance => {
	if (!record) return { ...student, savedToday: false }

	const savedReadingDetails = buildSavedReadingDetails(record)
	const hasSavedReadingDetails = Object.keys(savedReadingDetails).length > 0
	const isLockedForToday = hasCompleteSavedRecord(record, student)

	return {
		...student,
		attendance: record.status,
		evaluation: {
			hafiz: record.hafiz_level || undefined,
			tikrar: record.tikrar_level || undefined,
			samaa: record.samaa_level || undefined,
			rabet: record.rabet_level || undefined,
		},
		readingDetails: hasSavedReadingDetails ? savedReadingDetails : student.planReadingDetails,
		hafizExtraPages: normalizeHafizExtraPages(record.hafiz_extra_pages),
		savedToday: isLockedForToday,
	}
}

const hasCompletePresentEvaluation = (student: StudentAttendance) => {
	if (!isEvaluatedAttendance(student.attendance)) return false
	if (!student.hasPlan) return false

	return !!(
		student.evaluation?.hafiz &&
		student.evaluation?.tikrar &&
		student.evaluation?.samaa &&
		student.evaluation?.rabet
	)
}

const canManageHafizExtra = (student: StudentAttendance) => (
	!student.savedToday
	&& isEvaluatedAttendance(student.attendance)
	&& !!student.hasPlan
	&& !!student.evaluation?.hafiz
	&& student.evaluation.hafiz !== "not_completed"
)

const isStudentReadyToSave = (student: StudentAttendance) => {
	if (student.savedToday || student.attendance === null) return false
	if (!isEvaluatedAttendance(student.attendance)) return true
	return hasCompletePresentEvaluation(student)
}

const hasPendingLocalChanges = (students: StudentAttendance[]) =>
	students.some(
		(student) =>
			!student.savedToday &&
			(
				student.attendance !== null ||
				!!student.notes ||
				!!student.hafizExtraPages ||
				!!student.evaluation?.hafiz ||
				!!student.evaluation?.tikrar ||
				!!student.evaluation?.samaa ||
				!!student.evaluation?.rabet
			),
	)

const getAttendanceLabel = (status: AttendanceStatus | null) => attendanceOptions.find((option) => option.value === status)?.label

const getEvaluationLabel = (level: EvaluationLevel | undefined) => evaluationOptions.find((option) => option.value === level)?.label

export default function HalaqahManagement() {
	const [isLoading, setIsLoading] = useState(true)
	const router = useRouter()
	const params = useParams()

	const [teacherData, setTeacherData] = useState<any>(null)
	const [students, setStudents] = useState<StudentAttendance[]>([])
	const [hasCircle, setHasCircle] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success">("idle")
	const [hasSavedToday, setHasSavedToday] = useState(false)
	const [notesStudentId, setNotesStudentId] = useState<string | null>(null)
	const [notesText, setNotesText] = useState("")
	const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
        const [isCompDialogOpen, setIsCompDialogOpen] = useState(false)
	const [isHafizExtraDialogOpen, setIsHafizExtraDialogOpen] = useState(false)
	const [hafizExtraStudentId, setHafizExtraStudentId] = useState<string | null>(null)
	const [draftHafizExtraPages, setDraftHafizExtraPages] = useState<HafizExtraPages | null>(null)
	const [compStudentId, setCompStudentId] = useState<string | null>(null)
		const [missedDays, setMissedDays] = useState<MissedDayRecord[]>([])
        const [isCompLoading, setIsCompLoading] = useState(false)
		const [showReadingSegments, setShowReadingSegments] = useState(false)
		const [studentsWithoutPlanCount, setStudentsWithoutPlanCount] = useState(0)
		const studentsRef = useRef<StudentAttendance[]>([])
		const readingSegmentsStorageKey = teacherData?.id
			? `halaqah-show-reading-segments-${teacherData.id}`
			: null

	const showAlert = useAlertDialog()

	useEffect(() => {
		const bootstrapAuth = async () => {
			try {
				const response = await fetch("/api/auth", { cache: "no-store" })
				if (!response.ok) {
					router.push("/login")
					return
				}

				const data = await response.json()
				const accountNumber = data.user?.accountNumber || localStorage.getItem("accountNumber") || ""

				if (!accountNumber) {
					router.push("/login")
					return
				}

				fetchTeacherData(String(accountNumber))
			} catch {
				router.push("/login")
			}
		}

		void bootstrapAuth()
	}, [router])

	useEffect(() => {
		if (!teacherData?.halaqah) return

		const refreshStudentsState = () => {
			if (hasPendingLocalChanges(studentsRef.current)) {
				return
			}

			void fetchStudents(teacherData.halaqah)
		}

		const handlePageShow = () => {
			refreshStudentsState()
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				refreshStudentsState()
			}
		}

		window.addEventListener("focus", refreshStudentsState)
		window.addEventListener("pageshow", handlePageShow)
		document.addEventListener("visibilitychange", handleVisibilityChange)

		return () => {
			window.removeEventListener("focus", refreshStudentsState)
			window.removeEventListener("pageshow", handlePageShow)
			document.removeEventListener("visibilitychange", handleVisibilityChange)
		}
	}, [teacherData?.halaqah])

	useEffect(() => {
		if (!readingSegmentsStorageKey) return

		const savedPreference = localStorage.getItem(readingSegmentsStorageKey)
		if (savedPreference !== null) {
			setShowReadingSegments(savedPreference === "true")
		}
	}, [readingSegmentsStorageKey])

	useEffect(() => {
		if (!readingSegmentsStorageKey) return
		localStorage.setItem(readingSegmentsStorageKey, String(showReadingSegments))
	}, [readingSegmentsStorageKey, showReadingSegments])

	useEffect(() => {
		studentsRef.current = students
	}, [students])

	const fetchTeacherData = async (accountNumber: string) => {
		try {
			const response = await fetch(`/api/teachers?account_number=${accountNumber}`)
			const data = await response.json()

			if (data.teachers && data.teachers.length > 0) {
				const teacher = data.teachers[0]
				setTeacherData(teacher)

				if (teacher.halaqah) {
					setHasCircle(true)
					fetchStudents(teacher.halaqah)
				} else {
					setHasCircle(false)
					setIsLoading(false)
				}
			} else {
				setHasCircle(false)
				setIsLoading(false)
			}
		} catch (error) {
			console.error("Error fetching teacher data:", error)
			setHasCircle(false)
			setIsLoading(false)
		}
	}

	const loadSavedStudentsForToday = async (halaqah: string, baseStudents?: StudentAttendance[]) => {
		try {
			const response = await fetch(
				`/api/attendance-by-date?date=${getKsaDateString()}&circle=${encodeURIComponent(halaqah)}&t=${Date.now()}`,
				{ cache: "no-store" },
			)
			const data = await response.json()
			const records: SavedAttendanceRecord[] = Array.isArray(data.records) ? data.records : []
			const savedMap = new Map(records.map((record) => [record.student_id, record] as const))

			const applySavedState = (list: StudentAttendance[]) =>
				list.map((student) => mergeSavedAttendance(student, savedMap.get(student.id)))

			const nextStudents = applySavedState(baseStudents ?? students)
			setStudents(nextStudents)
			setHasSavedToday(nextStudents.some((student) => student.savedToday))
			return nextStudents
		} catch (error) {
			console.error("Error loading saved attendance for today:", error)
		}
	}

	const fetchStudents = async (halaqah: string) => {
		try {
			const response = await fetch(`/api/students?circle=${encodeURIComponent(halaqah)}`)
			const data = await response.json()

			if (data.students) {
				const ids = data.students.map((student: any) => student.id).join(",")
				const batchPlanResponse = await fetch(`/api/student-plans?student_ids=${encodeURIComponent(ids)}`, { cache: "no-store" })
				const batchPlanData = batchPlanResponse.ok ? await batchPlanResponse.json() : { plansByStudent: {} }
				const planEntries = data.students.map((student: any) => (
					[student.id, batchPlanData.plansByStudent?.[student.id] || { plan: null, completedDays: 0 }] as const
				))

				const planMap = new Map<string, PlanProgressResponse>(planEntries)

				const localStudentsMap = new Map(studentsRef.current.map((student) => [student.id, student] as const))

				const allMappedStudents: StudentAttendance[] = data.students.map((student: any) => {
					const planData = planMap.get(student.id)
					const planReadingDetails = getPlanReadingDetails(planData?.plan ?? null, planData?.completedDays ?? 0, planData?.hafizExtraPages ?? 0)
					const localStudent = localStudentsMap.get(student.id)
					const hasUnsavedLocalChanges = !!localStudent && !localStudent.savedToday

					return {
						id: student.id,
						name: student.name,
						halaqah: student.circle_name || halaqah,
						hasPlan: !!planData?.plan,
						attendance: hasUnsavedLocalChanges ? localStudent.attendance : null,
						evaluation: hasUnsavedLocalChanges ? localStudent.evaluation || {} : {},
						readingDetails: hasUnsavedLocalChanges ? localStudent.readingDetails || planReadingDetails : planReadingDetails,
						planReadingDetails,
						notes: hasUnsavedLocalChanges ? localStudent.notes : undefined,
						hafizExtraPages: hasUnsavedLocalChanges ? (localStudent.hafizExtraPages || null) : null,
						savedToday: false,
					}
				})
				setStudentsWithoutPlanCount(allMappedStudents.filter((student) => !student.hasPlan).length)
				const mappedStudents = allMappedStudents.filter((student) => student.hasPlan)
				await loadSavedStudentsForToday(halaqah, mappedStudents)
			}
			setIsLoading(false)
		} catch (error) {
			console.error("Error fetching students:", error)
			setStudentsWithoutPlanCount(0)
			setIsLoading(false)
		}
	}

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<SiteLoader size="lg" />
			</div>
		)
	}

	if (!hasCircle || !teacherData?.halaqah) {
		return (
			<div className="min-h-screen flex flex-col bg-gradient-to-br from-[#f5f1e8] to-white">
				<Header />
				<main className="flex-1 py-4 px-4">
					<div className="container mx-auto max-w-7xl">
						<div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
							<h1 className="text-3xl font-bold text-[#1a2332]">لا يوجد لديك حلقة</h1>
							<p className="text-lg text-[#1a2332]/70">الرجاء التواصل مع الإدارة لتعيين حلقة لك</p>
							<Button onClick={() => router.push("/teacher/dashboard")} className="mt-4">
								<ArrowRight className="w-5 h-5 ml-2" />
								العودة إلى لوحة التحكم
							</Button>
						</div>
					</div>
				</main>
				<Footer />
			</div>
		)
	}

	const toggleAttendance = (id: string, status: AttendanceStatus) => {
		const student = students.find((s) => s.id === id)
		if (student?.savedToday || !student?.hasPlan) return

		setStudents(
			students.map((s) =>
				s.id === id
					? {
							...s,
							attendance: status,
							hafizExtraPages: isEvaluatedAttendance(status) ? s.hafizExtraPages || null : null,
							evaluation:
								isNonEvaluatedAttendance(status)
									? {}
									: s.hasPlan
										? s.evaluation
										: { ...s.evaluation, hafiz: "not_completed" },
							readingDetails: s.planReadingDetails || s.readingDetails,
						}
					: s,
			),
		)
	}

	const setEvaluation = (studentId: string, type: EvaluationType, level: EvaluationLevel) => {
		const student = students.find((s) => s.id === studentId)
		if (student?.savedToday || (type === "hafiz" && !student?.hasPlan)) return

		setStudents(
			students.map((s) =>
				s.id === studentId
					? {
							...s,
							evaluation: { ...s.evaluation, [type]: level },
							hafizExtraPages: type === "hafiz" && level === "not_completed" ? null : s.hafizExtraPages || null,
						}
					: s,
			),
		)
	}

	const setAllEvaluations = (studentId: string, level: EvaluationLevel) => {
		const student = students.find((s) => s.id === studentId)
		if (student?.savedToday) return

		setStudents(
			students.map((s) =>
				s.id === studentId
					? {
							...s,
							evaluation: {
								...s.evaluation,
								...(s.hasPlan ? { hafiz: level } : {}),
								tikrar: level,
								samaa: level,
								rabet: level,
							},
						}
					: s,
			),
		)
	}

	const handleReset = () => {
		setStudents(
			students.map((s) =>
				s.savedToday ? s : { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {}, hafizExtraPages: null },
			),
		)
	}

	const handleSave = async () => {
		const studentsToSave = students.filter(isStudentReadyToSave)
		const hasIncompletePresentStudents = students.some(
			(student) => !student.savedToday && isEvaluatedAttendance(student.attendance) && !hasCompletePresentEvaluation(student),
		)

		if (studentsToSave.length === 0) {
			await showAlert(
				hasIncompletePresentStudents
					? "يجب إكمال جميع فروع التقييم للطالب الحاضر أو المتأخر قبل الحفظ."
					: "لا يوجد طلاب جدد جاهزون للحفظ اليوم",
				"تحذير",
			)
			return
		}

		const allPresentsEvaluated = studentsToSave
			.filter((s) => isEvaluatedAttendance(s.attendance))
			.every(hasCompletePresentEvaluation)

		if (!allPresentsEvaluated) {
			await showAlert("لم يتم تقييم جميع الطلاب الحاضرين أو المتأخرين في كل الفروع! تأكد من إكمال التقييم قبل الحفظ", "تحذير")
			return
		}

		setIsSaving(true)
		setSaveStatus("saving")

		try {
			const response = await fetch("/api/attendance/batch", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					teacher_id: teacherData.id,
					halaqah: teacherData.halaqah,
					students: studentsToSave.map((student) => ({
						id: student.id,
						attendance: student.attendance,
						evaluation: student.evaluation || {},
						readingDetails: student.readingDetails || {},
						notes: student.notes || null,
						hafizExtraPages: student.hafizExtraPages || null,
					})),
				}),
			})
			const data = await response.json().catch(() => ({}))

			if (!response.ok || !data.success) {
				throw new Error(data.error || "حدث خطأ أثناء حفظ البيانات")
			}

			await loadSavedStudentsForToday(teacherData.halaqah)
			setSaveStatus("success")

			const whatsappSummary = data.whatsapp as {
				ready?: boolean
				queuedCount?: number
				skippedReasons?: {
					missingGuardianPhone?: number
					invalidPhone?: number
				}
			} | undefined

			if (whatsappSummary && !whatsappSummary.ready) {
				await showAlert("تم حفظ التقييم، لكن واتساب غير مربوط حاليًا. الرسائل أُضيفت للطابور وستُرسل بعد إعادة الربط.", "تنبيه")
			} else if ((whatsappSummary?.skippedReasons?.missingGuardianPhone || 0) > 0 || (whatsappSummary?.skippedReasons?.invalidPhone || 0) > 0) {
				const missingGuardianPhoneCount = whatsappSummary?.skippedReasons?.missingGuardianPhone || 0
				const invalidPhoneCount = whatsappSummary?.skippedReasons?.invalidPhone || 0
				const warnings = [
					missingGuardianPhoneCount > 0 ? `${missingGuardianPhoneCount} بدون رقم ولي أمر` : null,
					invalidPhoneCount > 0 ? `${invalidPhoneCount} برقم غير صالح` : null,
				].filter(Boolean)

				await showAlert(`تم حفظ التقييم، لكن بعض رسائل واتساب لم تُرسل: ${warnings.join("، ")}.`, "تنبيه")
			}

			setTimeout(() => {
				setSaveStatus("idle")
				setIsSaving(false)
			}, 1600)
		} catch (error) {
			console.error("Error saving data:", error)
			setSaveStatus("idle")
			setIsSaving(false)
			await showAlert(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ البيانات", "خطأ")
		}
	}

	const markAllPresent = () => {
		setStudents(
			students.map((s) =>
				s.savedToday
					? s
					: !s.hasPlan
						? { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {}, hafizExtraPages: null }
						: { ...s, attendance: "present", evaluation: s.evaluation || {}, readingDetails: s.planReadingDetails || {}, hafizExtraPages: null },
			),
		)
	}

	const markAllLate = () => {
		setStudents(
			students.map((s) =>
				s.savedToday
					? s
					: !s.hasPlan
						? { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {}, hafizExtraPages: null }
						: { ...s, attendance: "late", evaluation: s.evaluation || {}, readingDetails: s.planReadingDetails || {}, hafizExtraPages: null },
			),
		)
	}

	const markAllAbsent = () => {
		setStudents(
			students.map((s) =>
				s.savedToday
					? s
					: !s.hasPlan
						? { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {}, hafizExtraPages: null }
						: { ...s, attendance: "absent", evaluation: {}, readingDetails: s.planReadingDetails || {}, hafizExtraPages: null },
			),
		)
	}

	const markAllExcused = () => {
		setStudents(
			students.map((s) =>
				s.savedToday
					? s
					: !s.hasPlan
						? { ...s, attendance: null, evaluation: {}, readingDetails: s.planReadingDetails || {}, hafizExtraPages: null }
						: { ...s, attendance: "excused", evaluation: {}, readingDetails: s.planReadingDetails || {}, hafizExtraPages: null },
			),
		)
	}

	const loadMissedDays = async (studentId: string) => {
		setIsCompLoading(true)
		try {
			const res = await fetch(`/api/compensation/missed?student_id=${studentId}&t=${Date.now()}`, {
				cache: "no-store",
			})
			const data = await res.json()
			setMissedDays(data.missedDays || [])
		} catch (e) {
			console.error(e)
			setMissedDays([])
		} finally {
			setIsCompLoading(false)
		}
	}

	const refreshStudentPlanState = async (studentId: string) => {
		try {
			const planResponse = await fetch(`/api/student-plans?student_id=${studentId}&t=${Date.now()}`, {
				cache: "no-store",
			})
			if (!planResponse.ok) return

			const planData: PlanProgressResponse = await planResponse.json()
			const nextReadingDetails = getPlanReadingDetails(planData?.plan ?? null, planData?.completedDays ?? 0, planData?.hafizExtraPages ?? 0)

			setStudents((prev) =>
				prev.map((student) =>
					student.id === studentId
						? {
								...student,
								hasPlan: !!planData?.plan,
								readingDetails: nextReadingDetails,
								planReadingDetails: nextReadingDetails,
								hafizExtraPages: student.savedToday ? student.hafizExtraPages || null : student.hafizExtraPages || null,
							}
						: student,
				),
			)
		} catch (error) {
			console.error("Error refreshing student plan after compensation:", error)
		}
	}

	const openCompDialog = async (studentId: string) => {
		setCompStudentId(studentId)
		setMissedDays([])
		setIsCompDialogOpen(true)
		await loadMissedDays(studentId)
	}

	const handleCompensate = async (missedDay: MissedDayRecord) => {
		if (!compStudentId) {
			await showAlert("تعذر تحديد الطالب المطلوب تعويضه", "خطأ")
			return
		}

		try {
			const res = await fetch(`/api/compensation`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					student_id: compStudentId,
					teacher_id: teacherData.id,
					halaqah: teacherData.halaqah,
					date: missedDay.date,
					hafiz_from_surah: missedDay.hafiz_from_surah || null,
					hafiz_from_verse: missedDay.hafiz_from_verse || null,
					hafiz_to_surah: missedDay.hafiz_to_surah || null,
					hafiz_to_verse: missedDay.hafiz_to_verse || null,
					compensated_content: missedDay.content,
				}),
			})
			const data = await res.json()
			if (data.success) {
				await loadMissedDays(compStudentId)
				await refreshStudentPlanState(compStudentId)
				await showAlert("تم تسجيل التعويض بنجاح.", "نجاح")
			} else {
				await showAlert(data.error || "خطأ في التعويض", "خطأ")
			}
		} catch (e) {
			await showAlert("حدث خطأ في النظام", "خطأ")
		}
	}

		const openNotesDialog = (studentId: string) => {
		const student = students.find((s) => s.id === studentId)
			if (student?.savedToday) return
		setNotesStudentId(studentId)
		setNotesText(student?.notes || "")
		setIsNotesDialogOpen(true)
	}

	const saveNotes = () => {
		if (notesStudentId !== null) {
			setStudents(students.map((s) => s.id === notesStudentId ? { ...s, notes: notesText } : s))
		}
		setIsNotesDialogOpen(false)
	}

	const openHafizExtraDialog = (studentId: string) => {
		const student = students.find((item) => item.id === studentId)
		if (!student || !canManageHafizExtra(student)) return

		setHafizExtraStudentId(studentId)
		setDraftHafizExtraPages(student.hafizExtraPages || null)
		setIsHafizExtraDialogOpen(true)
	}

	const saveHafizExtra = () => {
		if (!hafizExtraStudentId) return

		setStudents((prev) => prev.map((student) => (
			student.id === hafizExtraStudentId
				? { ...student, hafizExtraPages: draftHafizExtraPages || null }
				: student
		)))
		setIsHafizExtraDialogOpen(false)
	}

	const clearHafizExtra = () => {
		setDraftHafizExtraPages(null)
	}

	const halaqahName = teacherData?.halaqah || "الحلقة"

	const EvaluationOption = ({
		studentId,
		type,
		label,
	}: {
		studentId: string
		type: EvaluationType
		label: string
	}) => {
		const student = students.find((s) => s.id === studentId)
		const currentLevel = student?.evaluation?.[type] || null
		const currentDetails = type === "hafiz" || type === "samaa" || type === "rabet" ? student?.readingDetails?.[type] : null
		const showsReadingFields = type === "hafiz" || type === "samaa" || type === "rabet"
		const readingSummary = formatReadingDetails(currentDetails)
		const emptyReadingMessage =
			type === "samaa"
				? "لا يوجد لديه مراجعة لليوم"
				: type === "rabet"
					? "لا يوجد لديه ربط لليوم"
					: "لا يوجد لديه حفظ لليوم"
		const isSavedLocked = !!student?.savedToday
		const isHafizLocked = type === "hafiz" && !student?.hasPlan
		const isDisabled = isSavedLocked || isHafizLocked

		return (
			<div
				className={`space-y-2 rounded-xl border p-3 ${
					isSavedLocked
						? "border-[#3453a7]/25 bg-[#f5f8ff] opacity-75"
						: isHafizLocked
							? "border-red-200 bg-red-50/40"
							: "border-[#3453a7]/15"
				}`}
			>
				<div className="font-semibold text-[#1a2332] text-center">{label}</div>
					<Select
						value={currentLevel ?? undefined}
						onValueChange={(value) => setEvaluation(studentId, type, value as Exclude<EvaluationLevel, null>)}
						disabled={isDisabled}
					>
						<SelectTrigger className="h-10 w-full rounded-lg border-[#3453a7]/40 text-right text-sm" dir="rtl">
							<SelectValue placeholder="اختيار التقييم">
								{getEvaluationLabel(currentLevel) || "اختيار التقييم"}
							</SelectValue>
						</SelectTrigger>
						<SelectContent dir="rtl">
							{evaluationOptions.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
			{showReadingSegments && showsReadingFields && !isHafizLocked && (
				<div className="pt-2">
					<div className="px-1 py-1 text-right" dir="rtl">
						<p className="text-xs leading-6 text-[#526071]">
							{readingSummary || emptyReadingMessage}
						</p>
					</div>
				</div>
			)}
			</div>
		)
	}

	const savedStudentsCount = students.filter((student) => student.savedToday).length
	const pendingStudentsCount = students.filter(isStudentReadyToSave).length
	const hasPendingStudents = pendingStudentsCount > 0
	return (
		<div className="min-h-screen flex flex-col bg-white">
			<Header />

			<main className="flex-1 py-12 px-4">
				<div className="container mx-auto max-w-7xl">
					<div className="mb-8 overflow-x-auto pb-2">
						<div className="flex w-full flex-col items-start gap-2 sm:gap-2.5 md:min-w-max md:flex-row-reverse md:flex-nowrap md:items-center md:justify-end">
							<div className="flex w-fit items-center gap-2 self-start md:w-auto">
								{studentsWithoutPlanCount > 0 && (
									<Button
										variant="outline"
										type="button"
										onClick={() => void showAlert("يجب إضافة الخطة للطالب ليظهر في التقييم اليومي.", "معلومة")}
										className="h-11 w-11 shrink-0 rounded-full border-[#3453a7]/70 bg-white/90 p-0 text-[#3453a7] shadow-sm transition-all hover:bg-[#3453a7]/10 sm:h-10 sm:w-10"
										title="لماذا لا يظهر بعض الطلاب؟"
									>
										<CircleAlert className="h-4 w-4" />
									</Button>
								)}
								<label className="plan-history-checkbox h-11 w-fit shrink-0 rounded-full border border-[#3453a7]/70 bg-white/90 px-4 text-sm font-semibold text-[#1a2332] shadow-sm transition-all hover:bg-[#faf7f0] sm:h-10 sm:px-4 sm:text-sm">
									<input
										type="checkbox"
										checked={showReadingSegments}
										onChange={(e) => setShowReadingSegments(e.target.checked)}
									/>
									<span className="plan-history-checkbox__label whitespace-nowrap">معاينة الخطط</span>
									<span className="plan-history-checkbox__mark" aria-hidden="true" />
								</label>
							</div>
							<div className="flex w-fit max-w-full self-start flex-nowrap flex-row-reverse items-center justify-start gap-2 sm:w-auto sm:gap-2.5 md:min-w-max md:justify-end">
							<Button
								variant="outline"
								onClick={markAllLate}
								disabled={isSaving}
									className="h-11 shrink-0 rounded-xl border-[#3453a7]/80 bg-white px-4 text-sm font-semibold text-neutral-700 transition-all hover:border-[#3453a7] hover:bg-[#3453a7]/10 active:bg-[#3453a7]/15 focus-visible:border-[#3453a7] focus-visible:bg-[#3453a7]/10 focus-visible:text-neutral-800 focus-visible:ring-[#3453a7]/30 sm:h-10 sm:px-3 sm:text-sm"
							>
								متأخر
							</Button>
							<Button
								variant="outline"
								onClick={markAllExcused}
								disabled={isSaving}
									className="h-11 shrink-0 rounded-xl border-[#3453a7]/80 bg-white px-4 text-sm font-semibold text-neutral-700 transition-all hover:border-[#3453a7] hover:bg-[#3453a7]/10 active:bg-[#3453a7]/15 focus-visible:border-[#3453a7] focus-visible:bg-[#3453a7]/10 focus-visible:text-neutral-800 focus-visible:ring-[#3453a7]/30 sm:h-10 sm:px-3 sm:text-sm"
							>
								مستأذن
							</Button>
							<Button
								variant="outline"
								onClick={markAllAbsent}
								disabled={isSaving}
									className="h-11 shrink-0 rounded-xl border-[#3453a7]/80 bg-white px-4 text-sm font-semibold text-neutral-700 transition-all hover:border-[#3453a7] hover:bg-[#3453a7]/10 active:bg-[#3453a7]/15 focus-visible:border-[#3453a7] focus-visible:bg-[#3453a7]/10 focus-visible:text-neutral-800 focus-visible:ring-[#3453a7]/30 sm:h-10 sm:px-3 sm:text-sm"
							>
								غائب
							</Button>
							<Button
								variant="outline"
								onClick={markAllPresent}
								disabled={isSaving}
								className="h-11 shrink-0 rounded-xl border-[#3453a7]/80 bg-white px-4 text-sm font-semibold text-neutral-700 transition-all hover:border-[#3453a7] hover:bg-[#3453a7]/10 active:bg-[#3453a7]/15 focus-visible:border-[#3453a7] focus-visible:bg-[#3453a7]/10 focus-visible:text-neutral-800 focus-visible:ring-[#3453a7]/30 sm:h-10 sm:px-3 sm:text-sm"
							>
								حاضر
							</Button>
							</div>
						</div>
					</div>
					{students.length === 0 ? (
						<div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
							<p className="text-2xl font-bold text-[#1a2332]">{studentsWithoutPlanCount > 0 ? "لا يوجد طلاب لديهم خطة في هذه الحلقة" : "لا يوجد طلاب في هذه الحلقة"}</p>
							<p className="text-lg text-[#1a2332]/70">{studentsWithoutPlanCount > 0 ? "أضف خطة للطالب ليظهر في التقييم اليومي" : "يمكنك إضافة طلاب من لوحة التحكم"}</p>
						</div>
					) : (
						<>
							{/* Student List */}
							<div className="space-y-4">
								{students.map((student) => (
										(() => {
											return (
									<Card
										key={student.id}
										className={`border-2 shadow-lg transition-all ${
											student.savedToday
												? "border-[#3453a7]/25 bg-[#f5f8ff] opacity-80 pointer-events-none select-none"
												: "border-[#3453a7]/20"
										}`}
									>
										<CardContent className="pt-0 pb-0">
											<div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
												<div className="lg:col-span-2">
													<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
														<div className="space-y-1">
															<div className="flex flex-col gap-1">
															<div className="flex items-center gap-2 flex-wrap">
																<p className="text-base font-bold text-[#1a2332]">{student.name}</p>
																<Button
																	variant="outline"
																	onClick={() => openNotesDialog(student.id)}
																	title="الملاحظات"
																	disabled={student.savedToday}
																	className={`h-5 w-5 rounded-md p-0 transition-all flex-shrink-0 ${
																		student.notes
																			? "bg-[#3453a7]/20 border-[#3453a7] text-neutral-800 hover:bg-[#3453a7]/25 hover:border-[#3453a7] focus-visible:bg-[#3453a7]/20 focus-visible:border-[#3453a7] focus-visible:text-neutral-800 focus-visible:ring-[#3453a7]/30"
																			: "border-[#3453a7]/80 text-neutral-600 hover:bg-[#3453a7]/10 hover:border-[#3453a7] hover:text-neutral-800 focus-visible:bg-[#3453a7]/10 focus-visible:border-[#3453a7] focus-visible:text-neutral-800 focus-visible:ring-[#3453a7]/30"
																	}`}
																>
																	<MessageSquare className="w-3 h-3" />
																</Button>
																<Button
																	variant="outline"
																	onClick={() => openCompDialog(student.id)}
																	title="تعويض الحفظ"
																	disabled={!student.hasPlan}
																	className="h-5 w-5 rounded-md p-0 transition-all flex-shrink-0 border-[#3453a7]/80 text-neutral-600 hover:bg-[#3453a7]/10 hover:border-[#3453a7] hover:text-neutral-800 focus-visible:bg-[#3453a7]/10 focus-visible:border-[#3453a7] focus-visible:text-neutral-800 focus-visible:ring-[#3453a7]/30"
																>
																	<RotateCcw className="w-3 h-3" />
																</Button>
																<Button
																	variant="outline"
																	onClick={() => openHafizExtraDialog(student.id)}
																	title={student.hafizExtraPages ? `زيادة الحفظ: ${getHafizExtraLabel(student.hafizExtraPages)}` : "زيادة الحفظ"}
																	disabled={!canManageHafizExtra(student)}
																	className={`h-5 w-5 rounded-md p-0 transition-all flex-shrink-0 ${student.hafizExtraPages ? "bg-emerald-100 border-emerald-400 text-emerald-700 hover:bg-emerald-200 focus-visible:ring-emerald-300" : "border-[#3453a7]/80 text-neutral-600 hover:bg-[#3453a7]/10 hover:border-[#3453a7] hover:text-neutral-800 focus-visible:bg-[#3453a7]/10 focus-visible:border-[#3453a7] focus-visible:text-neutral-800 focus-visible:ring-[#3453a7]/30"}`}
																>
																	<Plus className="w-3 h-3" />
																</Button>
															</div>
															{student.hafizExtraPages && (
																<p className="text-[11px] font-semibold text-emerald-700">
																	زيادة الحفظ: {getHafizExtraLabel(student.hafizExtraPages)} (+{getHafizExtraPoints(student.hafizExtraPages)} نقاط)
																</p>
															)}
															<div className="space-y-1">
																<Select
																	value={student.attendance ?? undefined}
																	onValueChange={(value) => toggleAttendance(student.id, value as AttendanceStatus)}
																	disabled={student.savedToday}
																>
																	<SelectTrigger className="h-10 w-full rounded-lg border-[#3453a7]/40 text-right text-sm" dir="rtl">
																		<SelectValue placeholder="اختيار الحالة">
																			{getAttendanceLabel(student.attendance) || "اختيار الحالة"}
																		</SelectValue>
																	</SelectTrigger>
																	<SelectContent dir="rtl">
																		{attendanceOptions.map((option) => (
																			<SelectItem key={option.value} value={option.value}>
																				{option.label}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</div>
														</div>
													</div>

														{isEvaluatedAttendance(student.attendance) && !student.savedToday && student.hasPlan && (
															<div className="space-y-2 self-start pt-1 lg:pt-0">
																<p className="text-sm font-semibold text-[#1a2332] text-center">تقييم الكل:</p>
																<Select
																	onValueChange={(value) => setAllEvaluations(student.id, value as Exclude<EvaluationLevel, null>)}
																	disabled={student.savedToday}
																>
																	<SelectTrigger className="h-10 w-full rounded-lg border-[#3453a7]/40 text-right text-sm" dir="rtl">
																		<SelectValue placeholder="اختيار" />
																	</SelectTrigger>
																	<SelectContent dir="rtl">
																		{evaluationOptions.map((option) => (
																			<SelectItem key={option.value} value={option.value}>
																				{option.label}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															</div>
														)}
													</div>
												</div>

														{/* Evaluation Options */}
												{isEvaluatedAttendance(student.attendance) && !student.savedToday && student.hasPlan && (
															<div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-6">
														<EvaluationOption
															studentId={student.id}
															type="hafiz"
															label="الحفظ"
														/>
														<EvaluationOption
															studentId={student.id}
															type="tikrar"
															label="التكرار"
														/>
														<EvaluationOption
															studentId={student.id}
															type="samaa"
															label="المراجعة"
														/>
														<EvaluationOption
															studentId={student.id}
															type="rabet"
															label="الربط"
														/>
													</div>
												)}
											</div>
										</CardContent>
									</Card>
											)
										})()
								))}
							</div>

							<div className="flex justify-center gap-4 mt-8">
								<Button
									onClick={handleReset}
									variant="outline"
									className="h-12 rounded-lg border-[#3453a7]/80 bg-white px-8 text-base font-semibold text-[#3453a7] transition-all hover:bg-[#eef4ff] hover:border-[#3453a7] hover:text-[#28448e] focus-visible:border-[#3453a7] focus-visible:ring-[#3453a7]/30 active:bg-[#e2ecff]"
									disabled={isSaving}
								>
									<RotateCcw className="w-4 h-4 ml-2" />
									إعادة تعيين
								</Button>
								<Button
									onClick={handleSave}
									variant="outline"
									className="h-12 rounded-lg border-[#3453a7] bg-[#3453a7] px-8 text-base font-semibold !text-white transition-all hover:border-[#28448e] hover:bg-[#28448e] hover:!text-white disabled:border-[#8ea2df] disabled:bg-[#8ea2df] disabled:!text-white disabled:opacity-100"
									disabled={isSaving || !hasPendingStudents}
								>
									{saveStatus === "saving" && "جاري الحفظ"}
									{saveStatus === "success" && "تم الحفظ"}
									{saveStatus === "idle" && hasPendingStudents && "حفظ"}
									{saveStatus === "idle" && !hasPendingStudents && (hasSavedToday ? "حفظ" : "اختر الطلاب أولاً")}
								</Button>
							</div>
						</>
					)}
				</div>
			</main>

			<Footer />

			{/* Notes Dialog */}
			
                        <Dialog open={isCompDialogOpen} onOpenChange={setIsCompDialogOpen}>
                                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
                                        <DialogTitle className="text-xl font-bold text-center text-[#1a2332] mb-4">تعويض الحفظ السابق</DialogTitle>
                                        <div className="space-y-4">
										<p className="rounded-xl border border-[#3453a7]/15 bg-[#f5f8ff] px-3 py-2 text-xs font-medium leading-6 text-[#3453a7]">
											التعويض يتم بالتسلسل. كل تعويض ناجح يرفع المقطع التالي خطوة واحدة، لذلك فعّل التعويض الأول ثم سيظهر الذي بعده مباشرة.
										</p>
                                                {isCompLoading ? (
													<div className="flex justify-center items-center py-6"><SiteLoader size="sm" /></div>
                                                ) : missedDays.length === 0 ? (
											<div className="text-center text-[#3453a7] font-bold py-6">لا توجد أيام تعويض مستحقة حالياً</div>
                                                ) : (
                                                        <div className="space-y-3">
																{missedDays.map((md, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                                                                <div>
																<p className="font-semibold text-sm text-[#1a2332] mb-1">{md.content}</p>
																<p className="text-[11px] font-medium text-neutral-500">
																	{idx === 0 ? "هذا هو التعويض التالي الذي سيقدّم الخطة" : "يظهر بعد إنهاء التعويض السابق"}
																</p>
                                                                                </div>
                                                                                <Button 
                                                                                        size="sm" 
																			onClick={() => handleCompensate(md)}
																	disabled={idx !== 0}
																	className="rounded-lg border border-[#3453a7]/30 bg-[#3453a7]/10 px-3 py-1 h-8 text-xs font-medium text-[#4f73d1] transition-colors hover:bg-[#3453a7]/20 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 shrink-0"
                                                                                >
																{idx === 0 ? "تعويض الآن" : "لاحقاً"}
                                                                                </Button>
                                                                        </div>
                                                                ))}
                                                        </div>
                                                )}
                                        </div>
                                </DialogContent>
                        </Dialog>

                        <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>
				<DialogContent className="max-w-md" dir="rtl">
					<DialogTitle className="sr-only">الملاحظات</DialogTitle>
					<div className="space-y-4 pt-4">
						<Textarea
							value={notesText}
							onChange={(e) => setNotesText(e.target.value)}
							placeholder="اكتب ملاحظاتك هنا..."
							className="min-h-[120px] text-right border-[#3453a7]/50 focus-visible:ring-[#3453a7]/50"
						/>
						<div className="flex gap-2 justify-end">
							<Button
								variant="outline"
								onClick={() => setIsNotesDialogOpen(false)}
								className="text-sm h-9 rounded-lg border-[#3453a7]/80 text-neutral-600"
							>
								إلغاء
							</Button>
							<Button
								variant="outline"
								onClick={saveNotes}
								className="text-sm h-9 rounded-lg border-[#3453a7]/80 text-neutral-600 hover:bg-[#3453a7]/20 hover:border-[#3453a7] hover:text-neutral-800"
							>
								حفظ الملاحظة
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={isHafizExtraDialogOpen} onOpenChange={setIsHafizExtraDialogOpen}>
				<DialogContent className="max-w-md" dir="rtl">
					<DialogTitle className="text-center text-xl font-bold text-[#1a2332]">زيادة الحفظ</DialogTitle>
					<div className="space-y-4 pt-4">
						<p className="rounded-xl border border-[#3453a7]/15 bg-[#f5f8ff] px-3 py-2 text-xs font-medium leading-6 text-[#3453a7]">
							اختر مقدار الزيادة على حفظ اليوم.
						</p>
						<div className="grid grid-cols-3 gap-2">
							{HAFIZ_EXTRA_PAGE_VALUES.map((value) => {
								const isActive = draftHafizExtraPages === value
								return (
									<button
										key={value}
										type="button"
										onClick={() => setDraftHafizExtraPages(value)}
										className={`rounded-xl border px-3 py-3 text-sm font-bold transition-colors ${isActive ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-[#3453a7]/20 bg-white text-[#1a2332] hover:border-[#3453a7]/40 hover:bg-[#f5f8ff]"}`}
									>
										<div>{getHafizExtraLabel(value)}</div>
										<div className="mt-1 text-[11px] font-semibold text-neutral-500">+{getHafizExtraPoints(value)} نقاط</div>
									</button>
								)
							})}
						</div>
						<div className="flex gap-2 justify-end">
							<Button
								variant="outline"
								onClick={() => setIsHafizExtraDialogOpen(false)}
								className="text-sm h-9 rounded-lg border-[#3453a7]/80 text-neutral-600"
							>
								إلغاء
							</Button>
							<Button
								onClick={saveHafizExtra}
								disabled={!draftHafizExtraPages}
								className="text-sm h-9 rounded-lg bg-[#3453a7] text-white hover:bg-[#28448e]"
							>
								حفظ الزيادة
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}
