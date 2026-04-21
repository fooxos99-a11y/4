import { NextRequest, NextResponse } from "next/server"

import { insertNotificationsAndSendPush } from "@/lib/push-notifications"
import { getSaudiDateString } from "@/lib/saudi-time"
import { createAdminClient } from "@/lib/supabase/admin"

const DAILY_CHALLENGE_REMINDER_MESSAGE = "تحدي اليوم بانتظارك! ادخل الآن ولا تضيع النقاط قبل نهاية اليوم."
const DAILY_CHALLENGE_REMINDER_URL = "/daily-challenge"
const DAILY_CHALLENGE_REMINDER_HOUR_KSA = 21

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false
  }

  const candidate = error as { code?: string; message?: string; details?: string }
  return (
    candidate.code === "42P01" ||
    candidate.code === "PGRST205" ||
    `${candidate.message || ""}`.includes("does not exist") ||
    `${candidate.details || ""}`.includes("does not exist")
  )
}

function getSaudiHour(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(date)

  return Number(parts.find((part) => part.type === "hour")?.value || "0")
}

function isAuthorized(request: NextRequest) {
  const cronHeader = request.headers.get("x-vercel-cron")
  if (cronHeader === "1") {
    return true
  }

  const secret = String(process.env.CRON_SECRET || "").trim()
  if (!secret) {
    return false
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${secret}`) {
    return true
  }

  return request.nextUrl.searchParams.get("secret") === secret
}

async function loadPlayedStudentIdsForChallenge(
  supabase: ReturnType<typeof createAdminClient>,
  challengeIds: string[],
) {
  if (challengeIds.length === 0) {
    return new Set<string>()
  }

  const tableNames = ["daily_challenge_solutions", "challenge_submissions"] as const
  const playedStudentIds = new Set<string>()

  for (const tableName of tableNames) {
    const { data, error } = await supabase
      .from(tableName)
      .select("student_id")
      .in("challenge_id", challengeIds)

    if (error) {
      if (isMissingTableError(error)) {
        continue
      }

      throw error
    }

    for (const row of data || []) {
      const studentId = String((row as { student_id?: string | null }).student_id || "").trim()
      if (studentId) {
        playedStudentIds.add(studentId)
      }
    }
  }

  return playedStudentIds
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (getSaudiHour() < DAILY_CHALLENGE_REMINDER_HOUR_KSA) {
      return NextResponse.json({ skipped: true, reason: "before-reminder-time" })
    }

    const supabase = createAdminClient()
    const todayDate = getSaudiDateString()

    const { data: todayChallenges, error: challengeError } = await supabase
      .from("daily_challenges")
      .select("id")
      .eq("date", todayDate)

    if (challengeError && !isMissingTableError(challengeError)) {
      throw challengeError
    }

    const playedStudentIds = await loadPlayedStudentIdsForChallenge(
      supabase,
      (todayChallenges || []).map((challenge) => String(challenge.id || "")).filter(Boolean),
    )

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("id, account_number")
      .not("account_number", "is", null)

    if (studentsError) {
      throw studentsError
    }

    const reminderWindowStart = `${todayDate}T00:00:00+03:00`
    const reminderWindowEnd = `${todayDate}T23:59:59.999+03:00`
    const { data: existingReminders, error: existingRemindersError } = await supabase
      .from("notifications")
      .select("user_account_number")
      .eq("message", DAILY_CHALLENGE_REMINDER_MESSAGE)
      .gte("created_at", reminderWindowStart)
      .lte("created_at", reminderWindowEnd)

    if (existingRemindersError && !isMissingTableError(existingRemindersError)) {
      throw existingRemindersError
    }

    const alreadySentAccounts = new Set(
      (existingReminders || []).map((row) => String((row as { user_account_number?: string | number | null }).user_account_number || "").trim()).filter(Boolean),
    )

    const notifications = (students || [])
      .filter((student) => {
        const studentId = String(student.id || "").trim()
        const accountNumber = String(student.account_number || "").trim()

        return Boolean(studentId) && Boolean(accountNumber) && !playedStudentIds.has(studentId) && !alreadySentAccounts.has(accountNumber)
      })
      .map((student) => ({
        user_account_number: String(student.account_number || "").trim(),
        message: DAILY_CHALLENGE_REMINDER_MESSAGE,
        url: DAILY_CHALLENGE_REMINDER_URL,
        tag: `daily-challenge-reminder-${todayDate}`,
      }))

    if (notifications.length === 0) {
      return NextResponse.json({ success: true, sent: 0, date: todayDate })
    }

    await insertNotificationsAndSendPush(supabase, notifications)

    return NextResponse.json({ success: true, sent: notifications.length, date: todayDate })
  } catch (error) {
    console.error("[cron][daily-challenge-reminders]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "حدث خطأ غير معروف" },
      { status: 500 },
    )
  }
}