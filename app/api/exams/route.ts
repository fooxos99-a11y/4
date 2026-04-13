import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestSession, isPrivilegedRole, requireRoles } from "@/lib/auth/guards"
import { calculateExamScore, getExamSettings } from "@/lib/exam-settings"
import { getExamPortionSettings, normalizeExamPortionSettings } from "@/lib/exam-portion-settings"
import { getExamPortionLabel, getJuzNumberForPortion, isValidExamPortionNumber, normalizeExamPortionType } from "@/lib/exam-portions"
import { formatExamPortionLabel, getEligibleExamPortions } from "@/lib/student-exams"
import { getScheduledSessionProgress } from "@/lib/plan-progress"
import { insertNotificationsAndSendPush } from "@/lib/push-notifications"
import { getSaudiDateString } from "@/lib/saudi-time"
import { getJuzBounds, getLegacyPreviousMemorizationFields, getNormalizedCompletedJuzs, getPendingMasteryJuzs, getStoredMemorizedRanges, subtractMemorizedRangeFromRanges } from "@/lib/quran-data"
import { getOrCreateActiveSemester, isMissingSemestersTable, isNoActiveSemesterError } from "@/lib/semesters"
import { buildExamAppNotificationMessage, fillExamWhatsAppTemplate, getExamWhatsAppTemplates } from "@/lib/whatsapp-notification-templates"
import { enqueueWhatsAppMessage } from "@/lib/whatsapp-queue"

const ADVANCING_MEMORIZATION_LEVELS = ["excellent", "good", "very_good"]

function getErrorMessage(error: unknown) {
	if (!error) return "حدث خطأ غير معروف"
	if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
	if (typeof error === "object") {
		const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
		return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
	}
	return String(error)
}

function isMissingStudentExamsTable(error: unknown) {
	if (!error || typeof error !== "object") {
		return false
	}

	const candidate = error as { code?: unknown; message?: unknown; details?: unknown }
	return (
		candidate.code === "42P01" ||
		candidate.code === "PGRST205" ||
		(typeof candidate.message === "string" && candidate.message.includes("student_exams")) ||
		(typeof candidate.details === "string" && candidate.details.includes("student_exams"))
	)
}

function isMissingExamPortionColumns(error: unknown) {
	const message = getErrorMessage(error)
	return /portion_type|portion_number/i.test(message) && /column|does not exist|schema cache/i.test(message)
}

function parseCount(value: unknown) {
	const parsed = Number(value)
	if (!Number.isFinite(parsed) || parsed < 0) {
		return 0
	}

	return Math.floor(parsed)
}

function formatExamDate(dateValue: string) {
	const [year, month, day] = String(dateValue || "").split("-")
	if (!year || !month || !day) {
		return dateValue
	}

	return `${year}/${month}/${day}`
}

function isValidIsoDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim())
}

function buildStudentMemorizedRanges(student: {
	memorized_ranges?: unknown[] | null
	memorized_start_surah?: number | null
	memorized_start_verse?: number | null
	memorized_end_surah?: number | null
	memorized_end_verse?: number | null
	completed_juzs?: number[] | null
}) {
	const storedRanges = getStoredMemorizedRanges(student)
	const completedJuzRanges = getNormalizedCompletedJuzs(student.completed_juzs)
		.map((juzNumber) => getJuzBounds(juzNumber))
		.filter((bounds): bounds is NonNullable<ReturnType<typeof getJuzBounds>> => Boolean(bounds))
		.map((bounds) => ({
			startSurahNumber: bounds.startSurahNumber,
			startVerseNumber: bounds.startVerseNumber,
			endSurahNumber: bounds.endSurahNumber,
			endVerseNumber: bounds.endVerseNumber,
		}))

	return getStoredMemorizedRanges({
		memorized_ranges: [...storedRanges, ...completedJuzRanges],
	})
}

function hasCompletedMemorization(record: any) {
	const evaluations = Array.isArray(record.evaluations)
		? record.evaluations
		: record.evaluations
			? [record.evaluations]
			: []

	if ((record.status !== "present" && record.status !== "late") || evaluations.length === 0) {
		return false
	}

	const latestEvaluation = evaluations[evaluations.length - 1]
	return ADVANCING_MEMORIZATION_LEVELS.includes(latestEvaluation?.hafiz_level ?? "")
}

function getScheduledStudyDates(startDate: string, maxSessions: number, endDate = getSaudiDateString()) {
	const scheduledDates: string[] = []
	const currentDate = new Date(startDate)
	const lastDate = new Date(endDate)

	while (currentDate <= lastDate && scheduledDates.length < maxSessions) {
		const dayOfWeek = currentDate.getDay()
		if (dayOfWeek !== 5 && dayOfWeek !== 6) {
			scheduledDates.push(currentDate.toISOString().split("T")[0])
		}
		currentDate.setDate(currentDate.getDate() + 1)
	}

	return scheduledDates
}

async function getStudentActivePlanProgress(supabase: Awaited<ReturnType<typeof createClient>>, studentId: string, semesterId: string) {
	const { data: plan, error: planError } = await supabase
		.from("student_plans")
		.select("direction, total_pages, total_days, daily_pages, has_previous, prev_start_surah, prev_start_verse, prev_end_surah, prev_end_verse, previous_memorization_ranges, start_surah_number, start_verse, end_surah_number, end_verse, start_date")
		.eq("student_id", studentId)
		.eq("semester_id", semesterId)
		.order("created_at", { ascending: false })
		.limit(1)
		.maybeSingle()

	if (planError) {
		throw planError
	}

	if (!plan) {
		return null
	}

	let attendanceQuery = supabase
		.from("attendance_records")
		.select("id, date, status, is_compensation, created_at, evaluations(hafiz_level)")
		.eq("student_id", studentId)
		.eq("semester_id", semesterId)
		.order("date", { ascending: true })

	if (plan.start_date) {
		attendanceQuery = attendanceQuery.gte("date", plan.start_date)
	}

	const { data: attendanceRecords, error: attendanceError } = await attendanceQuery

	if (attendanceError) {
		throw attendanceError
	}

	const scheduledDates = plan.start_date
		? getScheduledStudyDates(
			plan.start_date,
			Number(plan.total_days) > 0
				? Number(plan.total_days)
				: (Number(plan.total_pages) > 0 && Number(plan.daily_pages) > 0 ? Math.max(0, Math.ceil(Number(plan.total_pages) / Number(plan.daily_pages))) : 0),
		)
		: []
	const passingRecords = (attendanceRecords || []).filter(hasCompletedMemorization)
	const completedDays = getScheduledSessionProgress(passingRecords, scheduledDates).completedDays

	return { plan, completedDays }
}

async function markFailedJuzForRememorization(
	supabase: Awaited<ReturnType<typeof createClient>>,
	student: {
		id: string
		completed_juzs?: number[] | null
		current_juzs?: number[] | null
		memorized_ranges?: unknown[] | null
		memorized_start_surah?: number | null
		memorized_start_verse?: number | null
		memorized_end_surah?: number | null
		memorized_end_verse?: number | null
	},
	failedJuzNumber: number,
) {
	const nextCompletedJuzs = getNormalizedCompletedJuzs(student.completed_juzs).filter((juzNumber) => juzNumber !== failedJuzNumber)
	const nextCurrentJuzs = Array.from(new Set([
		...getPendingMasteryJuzs(student.current_juzs, student.completed_juzs),
		failedJuzNumber,
	])).sort((left, right) => left - right)
	const failedJuzBounds = getJuzBounds(failedJuzNumber)
	const currentRanges = buildStudentMemorizedRanges(student)
	const nextRanges = failedJuzBounds
		? subtractMemorizedRangeFromRanges(currentRanges, {
			startSurahNumber: failedJuzBounds.startSurahNumber,
			startVerseNumber: failedJuzBounds.startVerseNumber,
			endSurahNumber: failedJuzBounds.endSurahNumber,
			endVerseNumber: failedJuzBounds.endVerseNumber,
		})
		: currentRanges
	const legacyFields = getLegacyPreviousMemorizationFields(nextRanges)

	const { error: updateStudentError } = await supabase
		.from("students")
		.update({
			completed_juzs: nextCompletedJuzs,
			current_juzs: nextCurrentJuzs,
			memorized_ranges: nextRanges.length > 0 ? nextRanges : null,
			memorized_start_surah: legacyFields.prev_start_surah,
			memorized_start_verse: legacyFields.prev_start_verse,
			memorized_end_surah: legacyFields.prev_end_surah,
			memorized_end_verse: legacyFields.prev_end_verse,
		})
		.eq("id", student.id)

	if (updateStudentError) {
		throw updateStudentError
	}
}

async function markPassedJuzAsMemorized(
	supabase: Awaited<ReturnType<typeof createClient>>,
	student: {
		id: string
		completed_juzs?: number[] | null
		current_juzs?: number[] | null
		memorized_ranges?: unknown[] | null
		memorized_start_surah?: number | null
		memorized_start_verse?: number | null
		memorized_end_surah?: number | null
		memorized_end_verse?: number | null
	},
	passedJuzNumber: number,
) {
	const nextCompletedJuzs = Array.from(new Set([
		...getNormalizedCompletedJuzs(student.completed_juzs),
		passedJuzNumber,
	])).sort((left, right) => left - right)
	const nextCurrentJuzs = getPendingMasteryJuzs(student.current_juzs, nextCompletedJuzs).filter((juzNumber) => juzNumber !== passedJuzNumber)
	const nextRanges = buildStudentMemorizedRanges({
		...student,
		completed_juzs: nextCompletedJuzs,
	})
	const legacyFields = getLegacyPreviousMemorizationFields(nextRanges)

	const { error: updateStudentError } = await supabase
		.from("students")
		.update({
			completed_juzs: nextCompletedJuzs,
			current_juzs: nextCurrentJuzs,
			memorized_ranges: nextRanges.length > 0 ? nextRanges : null,
			memorized_start_surah: legacyFields.prev_start_surah,
			memorized_start_verse: legacyFields.prev_start_verse,
			memorized_end_surah: legacyFields.prev_end_surah,
			memorized_end_verse: legacyFields.prev_end_verse,
		})
		.eq("id", student.id)

	if (updateStudentError) {
		throw updateStudentError
	}
}

async function hasPassedBothHizbsInJuz(
	supabase: Awaited<ReturnType<typeof createClient>>,
	studentId: string,
	semesterId: string,
	juzNumber: number,
) {
	const firstHizb = juzNumber * 2 - 1
	const secondHizb = juzNumber * 2

	const { data, error } = await supabase
		.from("student_exams")
		.select("portion_number, passed")
		.eq("student_id", studentId)
		.eq("semester_id", semesterId)
		.eq("portion_type", "hizb")
		.in("portion_number", [firstHizb, secondHizb])
		.eq("passed", true)

	if (error) {
		throw error
	}

	const passedHizbs = new Set((data || []).map((row) => Number(row.portion_number)))
	return passedHizbs.has(firstHizb) && passedHizbs.has(secondHizb)
}

export async function GET(request: Request) {
	try {
		const session = await getRequestSession(request)
		if (!session) {
			return NextResponse.json({ error: "يجب تسجيل الدخول أولاً" }, { status: 401 })
		}

		if (!isPrivilegedRole(session.role) && session.role !== "student") {
			return NextResponse.json({ error: "ليس لديك صلاحية الوصول" }, { status: 403 })
		}

		const supabase = createAdminClient()
		const activeSemester = await getOrCreateActiveSemester(supabase)
		const { searchParams } = new URL(request.url)
		let circleName = String(searchParams.get("circle") || "").trim()
		let studentId = String(searchParams.get("student_id") || "").trim()
		const semesterId = String(searchParams.get("semester_id") || activeSemester.id).trim()

		if (session.role === "student") {
			const { data: student, error: studentError } = await supabase
				.from("students")
				.select("id")
				.eq("account_number", Number(session.accountNumber))
				.maybeSingle()

			if (studentError) {
				throw studentError
			}

			if (!student?.id) {
				return NextResponse.json({ exams: [], tableMissing: false }, { status: 200 })
			}

			studentId = String(student.id)
			circleName = ""
		}

		const portionSettings = await getExamPortionSettings()

		let query = supabase
			.from("student_exams")
			.select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date, alerts_count, mistakes_count, prompts_count, final_score, passed, notes, tested_by_name, tested_by_role, created_at, students(name, account_number)")
			.eq("semester_id", semesterId)
			.order("exam_date", { ascending: false })
			.order("created_at", { ascending: false })
			.limit(100)

		if (circleName) {
			query = query.eq("halaqah", circleName)
		}

		if (studentId) {
			query = query.eq("student_id", studentId)
		}

		const { data, error } = await query

		if (error) {
			if (isMissingExamPortionColumns(error)) {
				return NextResponse.json({ error: "حقول نظام الأجزاء/الأحزاب غير مضافة بعد. نفذ ملف scripts/050_add_exam_portion_mode.sql ثم أعد المحاولة." }, { status: 503 })
			}

			if (isMissingStudentExamsTable(error)) {
				return NextResponse.json({ exams: [], tableMissing: true }, { status: 200 })
			}

			throw error
		}

		return NextResponse.json({ exams: data || [], tableMissing: false, portionSettings })
	} catch (error) {
		console.error("[exams][GET]", error)
		if (isNoActiveSemesterError(error)) {
			return NextResponse.json({ exams: [], tableMissing: false, error: "لا يوجد فصل نشط حاليًا." }, { status: 409 })
		}
		if (isMissingSemestersTable(error)) {
			return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
		}
		return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
	}
}

export async function POST(request: Request) {
	try {
		const auth = await requireRoles(request, ["admin", "supervisor"])
		if ("response" in auth) {
			return auth.response
		}

		const { session } = auth
		const supabase = createAdminClient()
		const activeSemester = await getOrCreateActiveSemester(supabase)
		const body = await request.json()
		const portionSettings = await getExamPortionSettings()
		const studentId = String(body.student_id || "").trim()
		const examDate = String(body.exam_date || "").trim()
		const rawPortionLabel = String(body.exam_portion_label || "").trim()
		const portionType = normalizeExamPortionType(body.portion_type || portionSettings.mode)
		const portionNumber = body.portion_number === null || body.portion_number === undefined || body.portion_number === ""
			? (body.juz_number === null || body.juz_number === undefined || body.juz_number === "" ? null : Number(body.juz_number))
			: Number(body.portion_number)
		const testedByName = String(body.tested_by_name || "").trim() || session.name
		const alertsCount = parseCount(body.alerts_count)
		const mistakesCount = parseCount(body.mistakes_count)
		const notes = String(body.notes || "").trim() || null
		const failureAction = body.failure_action === "retest" ? "retest" : "rememorize"
		const retestDate = String(body.retest_date || "").trim()

		if (!studentId) {
			return NextResponse.json({ error: "الطالب مطلوب" }, { status: 400 })
		}

		const { data: student, error: studentError } = await supabase
			.from("students")
			.select("id, name, halaqah, account_number, guardian_phone, completed_juzs, current_juzs, memorized_ranges, memorized_start_surah, memorized_start_verse, memorized_end_surah, memorized_end_verse")
			.eq("id", studentId)
			.maybeSingle()

		if (studentError) {
			throw studentError
		}

		if (!student) {
			return NextResponse.json({ error: "الطالب غير موجود" }, { status: 404 })
		}

		if (!student.halaqah) {
			return NextResponse.json({ error: "الطالب غير مرتبط بحلقة" }, { status: 400 })
		}

		if (portionNumber === null) {
			return NextResponse.json({ error: portionType === "hizb" ? "اختر الحزب المختبر من القائمة" : "اختر الجزء المختبر من القائمة" }, { status: 400 })
		}

		if (!testedByName) {
			return NextResponse.json({ error: "اسم المختبر مطلوب" }, { status: 400 })
		}

		const activePlanProgress = await getStudentActivePlanProgress(supabase, student.id, activeSemester.id)
		const eligiblePortions = getEligibleExamPortions(student, activePlanProgress, portionType)
		if (!isValidExamPortionNumber(portionType, portionNumber)) {
			return NextResponse.json({ error: portionType === "hizb" ? "رقم الحزب غير صالح" : "رقم الجزء غير صالح" }, { status: 400 })
		}

		if (eligiblePortions.length > 0 && !eligiblePortions.some((portion) => portion.portionType === portionType && portion.portionNumber === portionNumber)) {
			return NextResponse.json({ error: portionType === "hizb" ? "الحزب المحدد ليس ضمن المحفوظ الحالي للطالب" : "الجزء المحدد ليس ضمن المحفوظ الحالي للطالب" }, { status: 400 })
		}

		const { data: existingExam, error: existingExamError } = await supabase
			.from("student_exams")
			.select("id, passed")
			.eq("student_id", student.id)
			.eq("semester_id", activeSemester.id)
			.eq("portion_type", portionType)
			.eq("portion_number", portionNumber)
			.maybeSingle()

		if (existingExamError) {
			if (isMissingExamPortionColumns(existingExamError)) {
				return NextResponse.json({ error: "حقول نظام الأجزاء/الأحزاب غير مضافة بعد. نفذ ملف scripts/050_add_exam_portion_mode.sql ثم أعد المحاولة." }, { status: 503 })
			}

			if (isMissingStudentExamsTable(existingExamError)) {
				return NextResponse.json({ error: "جدول الاختبارات غير موجود بعد. طبّق ملف SQL أولاً.", tableMissing: true }, { status: 503 })
			}

			throw existingExamError
		}

		if (existingExam?.id && existingExam.passed) {
			return NextResponse.json({ error: "هذا الجزء تم اختباره مسبقًا لهذا الطالب" }, { status: 400 })
		}

		const examPortionLabel = rawPortionLabel || formatExamPortionLabel(portionNumber, "اختبار حفظ", portionType)
		if (!examPortionLabel) {
			return NextResponse.json({ error: "مسمى الاختبار مطلوب" }, { status: 400 })
		}

		const settings = await getExamSettings()
		const score = calculateExamScore(
			{ alerts: alertsCount, mistakes: mistakesCount },
			settings,
		)

		const examPayload = {
			student_id: student.id,
			semester_id: activeSemester.id,
			halaqah: student.halaqah,
			exam_portion_label: examPortionLabel,
			portion_type: portionType,
			portion_number: portionNumber,
			juz_number: getJuzNumberForPortion(portionType, portionNumber),
			exam_date: examDate || undefined,
			alerts_count: alertsCount,
			mistakes_count: mistakesCount,
			prompts_count: 0,
			max_score: settings.maxScore,
			alert_deduction: settings.alertDeduction,
			mistake_deduction: settings.mistakeDeduction,
			prompt_deduction: 0,
			total_deduction: score.totalDeduction,
			final_score: score.finalScore,
			min_passing_score: settings.minPassingScore,
			passed: score.passed,
			notes,
			tested_by_user_id: session.id,
			tested_by_name: testedByName,
			tested_by_role: session.role,
		}

		const examMutation = existingExam?.id
			? supabase.from("student_exams").update(examPayload).eq("id", existingExam.id)
			: supabase.from("student_exams").insert([examPayload])

		const { data, error } = await examMutation
			.select("id, student_id, halaqah, exam_portion_label, portion_type, portion_number, juz_number, exam_date, alerts_count, mistakes_count, prompts_count, final_score, passed, notes, tested_by_name, tested_by_role, created_at")
			.single()

		if (error) {
			if (isMissingExamPortionColumns(error)) {
				return NextResponse.json({ error: "حقول نظام الأجزاء/الأحزاب غير مضافة بعد. نفذ ملف scripts/050_add_exam_portion_mode.sql ثم أعد المحاولة." }, { status: 503 })
			}

			if (isMissingStudentExamsTable(error)) {
				return NextResponse.json({ error: "جدول الاختبارات غير موجود بعد. طبّق ملف SQL أولاً.", tableMissing: true }, { status: 503 })
			}

			throw error
		}

		let requiresRememorization = false
		let resetWarning: string | null = null
		let scheduledRetest = false

		if (!score.passed) {
			if (failureAction === "retest") {
				if (!isValidIsoDate(retestDate)) {
					return NextResponse.json({ error: "تاريخ إعادة الاختبار غير صالح" }, { status: 400 })
				}
			} else {
				try {
					await markFailedJuzForRememorization(supabase, student, getJuzNumberForPortion(portionType, portionNumber) || portionNumber)
					requiresRememorization = true
				} catch (resetError) {
					console.error("[exams][POST] failed exam reset error", resetError)
					resetWarning = "تم تسجيل الرسوب لكن تعذر تحويل الجزء إلى إعادة حفظ تلقائيًا."
				}
			}
		} else {
			try {
				if (portionType === "juz") {
					await markPassedJuzAsMemorized(supabase, student, portionNumber)
				} else {
					const juzNumber = getJuzNumberForPortion(portionType, portionNumber)
					if (juzNumber && await hasPassedBothHizbsInJuz(supabase, student.id, activeSemester.id, juzNumber)) {
						await markPassedJuzAsMemorized(supabase, student, juzNumber)
					}
				}
			} catch (passSyncError) {
				console.error("[exams][POST] passed exam sync error", passSyncError)
				resetWarning = "تم تسجيل النجاح لكن تعذر مزامنة حالة المحفوظ تلقائيًا."
			}
		}

		const completedSchedulePayload = {
			status: "completed",
			completed_at: new Date().toISOString(),
			completed_exam_id: data.id,
			updated_at: new Date().toISOString(),
		}

		let scheduleCompletionQuery = supabase
			.from("exam_schedules")
			.update(completedSchedulePayload)
			.eq("student_id", student.id)
			.eq("semester_id", activeSemester.id)
			.eq("portion_type", portionType)
			.eq("portion_number", portionNumber)
			.eq("status", "scheduled")

		if (examDate) {
			scheduleCompletionQuery = scheduleCompletionQuery.lte("exam_date", examDate)
		}

		const { error: scheduleCompletionError } = await scheduleCompletionQuery
		if (scheduleCompletionError && !isMissingStudentExamsTable(scheduleCompletionError)) {
			console.error("[exams][POST] complete schedule error", scheduleCompletionError)
		}

		if (!score.passed && failureAction === "retest") {
			try {
				const { data: existingRetestSchedule, error: existingRetestScheduleError } = await supabase
					.from("exam_schedules")
					.select("id")
					.eq("student_id", student.id)
					.eq("semester_id", activeSemester.id)
					.eq("portion_type", portionType)
					.eq("portion_number", portionNumber)
					.eq("status", "scheduled")
					.maybeSingle()

				if (existingRetestScheduleError && !isMissingStudentExamsTable(existingRetestScheduleError)) {
					throw existingRetestScheduleError
				}

				if (!existingRetestSchedule?.id) {
					const { data: retestSchedule, error: retestScheduleError } = await supabase
						.from("exam_schedules")
						.insert({
							student_id: student.id,
							semester_id: activeSemester.id,
							halaqah: student.halaqah,
							exam_portion_label: examPortionLabel,
							portion_type: portionType,
							portion_number: portionNumber,
							juz_number: getJuzNumberForPortion(portionType, portionNumber),
							exam_date: retestDate,
							status: "scheduled",
							notification_sent_at: new Date().toISOString(),
							scheduled_by_user_id: session.id,
							scheduled_by_name: session.name,
							scheduled_by_role: session.role,
							updated_at: new Date().toISOString(),
						})
						.select("id")
						.single()

					if (retestScheduleError && !isMissingStudentExamsTable(retestScheduleError)) {
						throw retestScheduleError
					}

					if (retestSchedule?.id) {
						scheduledRetest = true
						const examWhatsAppTemplates = await getExamWhatsAppTemplates(supabase)
						const scheduleMessage = buildExamAppNotificationMessage("create", {
							studentName: student.name || "الطالب",
							date: formatExamDate(retestDate),
							portion: examPortionLabel,
							halaqah: student.halaqah,
						}, examWhatsAppTemplates)

						await insertNotificationsAndSendPush(supabase, [{
							user_account_number: String(student.account_number || ""),
							message: scheduleMessage,
							url: "/exams",
							tag: `exam-schedule-${retestSchedule.id}`,
						}])

						const scheduleWhatsAppMessage = fillExamWhatsAppTemplate(examWhatsAppTemplates.create, {
							studentName: student.name || "الطالب",
							date: formatExamDate(retestDate),
							portion: examPortionLabel,
							halaqah: student.halaqah,
						})

						await enqueueWhatsAppMessage(supabase, {
							phoneNumber: student.guardian_phone,
							message: scheduleWhatsAppMessage,
							userId: session.id,
							dedupeDate: retestDate,
						})
					}
				} else {
					scheduledRetest = true
					resetWarning = `يوجد بالفعل موعد إعادة اختبار مجدول بتاريخ ${formatExamDate(retestDate)}.`
				}
			} catch (retestScheduleError) {
				console.error("[exams][POST] retest schedule error", retestScheduleError)
				resetWarning = "تم تسجيل الرسوب لكن تعذر تحديد موعد إعادة الاختبار تلقائيًا."
			}
		}

		let notificationWarning: string | null = null

		try {
			const examWhatsAppTemplates = await getExamWhatsAppTemplates(supabase)
			const statusLabel = score.passed ? "مجتاز" : "غير مجتاز"
			const formattedDate = formatExamDate(String(data.exam_date || examDate || getSaudiDateString()))

			const appMessage = buildExamAppNotificationMessage("result", {
				studentName: student.name || "الطالب",
				date: formattedDate,
				portion: examPortionLabel,
				halaqah: student.halaqah,
			}, examWhatsAppTemplates)

			await insertNotificationsAndSendPush(supabase, [{
				user_account_number: String(student.account_number || ""),
				message: appMessage,
				url: "/exams",
				tag: `exam-result-${data.id}`,
			}])

			const whatsappMessage = fillExamWhatsAppTemplate(examWhatsAppTemplates.result, {
				studentName: student.name || "الطالب",
				date: formattedDate,
				portion: examPortionLabel,
				halaqah: student.halaqah,
				score: score.finalScore,
				maxScore: settings.maxScore,
				status: statusLabel,
				testedBy: testedByName,
				notes: notes ? ` الملاحظات: ${notes}` : "",
			})

			await enqueueWhatsAppMessage(supabase, {
				phoneNumber: student.guardian_phone,
				message: whatsappMessage,
				userId: session.id,
				dedupeDate: String(data.exam_date || examDate || getSaudiDateString()),
			})
		} catch (notificationError) {
			console.error("[exams][POST] result notification error", notificationError)
			notificationWarning = "تم حفظ التقييم لكن تعذر إرسال إشعار النتيجة."
		}

		return NextResponse.json({ success: true, exam: data, score, requiresRememorization, scheduledRetest, retestDate: scheduledRetest ? formatExamDate(retestDate) : null, resetWarning, notificationWarning }, { status: 201 })
	} catch (error) {
		console.error("[exams][POST]", error)
		if (isNoActiveSemesterError(error)) {
			return NextResponse.json({ error: "لا يوجد فصل نشط حاليًا. ابدأ فصلًا جديدًا قبل تسجيل الاختبارات." }, { status: 409 })
		}
		if (isMissingSemestersTable(error)) {
			return NextResponse.json({ error: "جدول الفصول غير موجود بعد. نفذ ملف scripts/046_create_semesters.sql ثم أعد المحاولة." }, { status: 503 })
		}
		return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
	}
}