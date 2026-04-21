import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { requireRoles } from "@/lib/auth/guards"
import {
  DAILY_CHALLENGE_COOKIE_NAME,
  type DailyChallengeAttempt,
  createSignedDailyChallengeToken,
  getClearedSessionCookieOptions,
  getDailyChallengeAttemptsFromCookieHeader,
  getDailyChallengeCookieOptions,
} from "@/lib/auth/session"

function getKsaDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role environment variables are not set")
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

const fallbackChallenges = [
  {
    type: "size_ordering",
    title: "تحدي الأشكال من الأكبر للأصغر",
    description: "اضغط على الأشكال من الأكبر للأصغر - 3 جولات",
    points_reward: 20,
  },
  {
    type: "color_difference",
    title: "تحدي اللون المختلف",
    description: "اعثر على الشكل الذي يختلف قليلاً في درجة اللون",
    points_reward: 20,
  },
  {
    type: "math_problems",
    title: "تحدي حل المسائل",
    description: "حل 5 مسائل رياضية بسيطة خلال 60 ثانية",
    points_reward: 20,
  },
  {
    type: "instant_memory",
    title: "لعبة الذاكرة اللحظية",
    description: "احفظ ترتيب الأشكال والألوان لمدة 10 ثواني ثم رتبها بشكل صحيح",
    points_reward: 20,
  },
]

const PENDING_ANSWER_MARKER = "__challenge_started__"
const CHALLENGE_SUBMISSION_TABLES = ["daily_challenge_solutions", "challenge_submissions"] as const
const CHALLENGE_SOLUTION_WRITE_SHAPES = [
  { answerKey: "answer", timeKey: "solved_at", pointsKey: "points_awarded" },
  { answerKey: "submitted_answer", timeKey: "solved_at", pointsKey: "points_awarded" },
  { answerKey: "submitted_answer", timeKey: "submitted_at", pointsKey: "points_earned" },
] as const

type ChallengeSubmissionTable = (typeof CHALLENGE_SUBMISSION_TABLES)[number]

function isMissingSubmissionStorageError(error: any) {
  const message = String(error?.message || "")
  const details = String(error?.details || "")
  const hint = String(error?.hint || "")

  return (
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    error?.code === "PGRST204" ||
    message.includes("schema cache") ||
    message.includes("Could not find the table") ||
    message.includes("Could not find the column") ||
    message.includes("does not exist") ||
    details.includes("Could not find the column") ||
    details.includes("does not exist") ||
    hint.includes("does not exist")
  )
}

function getStoredSolutionAnswer(solution: Record<string, any> | null | undefined) {
  if (!solution) {
    return null
  }

  if (Object.prototype.hasOwnProperty.call(solution, "answer")) {
    return solution.answer
  }

  if (Object.prototype.hasOwnProperty.call(solution, "submitted_answer")) {
    return solution.submitted_answer
  }

  return null
}

function isPendingSolution(solution: Record<string, any> | null | undefined) {
  const storedAnswer = getStoredSolutionAnswer(solution)
  return storedAnswer == null || storedAnswer === PENDING_ANSWER_MARKER
}

async function findExistingSolution(
  supabase: ReturnType<typeof createAdminClient>,
  challengeId: string,
  studentId: string,
) {
  let lastError: any = null

  for (const tableName of CHALLENGE_SUBMISSION_TABLES) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("student_id", studentId)
        .maybeSingle()

      if (!error) {
        return { tableName, data }
      }

      if (isMissingSubmissionStorageError(error)) {
        continue
      }

      lastError = error
    } catch (error) {
      if (isMissingSubmissionStorageError(error)) {
        continue
      }

      lastError = error
    }
  }

  if (!lastError) {
    return { tableName: undefined, data: null }
  }

  throw lastError
}

function pruneChallengeAttempts(attempts: DailyChallengeAttempt[], activeDate: string) {
  return attempts
    .filter((attempt) => attempt?.studentId && attempt?.date && attempt?.challengeId)
    .filter((attempt) => attempt.date >= activeDate)
    .slice(-30)
}

async function buildChallengeAttemptCookieValue(
  existingAttempts: DailyChallengeAttempt[],
  nextAttempt: DailyChallengeAttempt,
) {
  const remainingAttempts = existingAttempts.filter(
    (attempt) => !(attempt.studentId === nextAttempt.studentId && attempt.date === nextAttempt.date),
  )

  return createSignedDailyChallengeToken(pruneChallengeAttempts([...remainingAttempts, nextAttempt], nextAttempt.date))
}

function findChallengeAttempt(
  attempts: DailyChallengeAttempt[],
  studentId: string,
  date: string,
) {
  return attempts.find((attempt) => attempt.studentId === studentId && attempt.date === date) ?? null
}

function withChallengeAttemptCookie(
  response: NextResponse,
  cookieToken: { token: string; expiresAt: number } | null,
) {
  if (!cookieToken) {
    response.cookies.set(DAILY_CHALLENGE_COOKIE_NAME, "", getClearedSessionCookieOptions())
    return response
  }

  response.cookies.set(DAILY_CHALLENGE_COOKIE_NAME, cookieToken.token, getDailyChallengeCookieOptions(cookieToken.expiresAt))
  return response
}

async function insertChallengeSolution(
  supabase: ReturnType<typeof createAdminClient>,
  payload: {
    challenge_id: string
    student_id: string
    student_name: string
    answerValue: string
    is_correct: boolean
    solved_at?: string
    preferredTableName?: ChallengeSubmissionTable
  },
) {
  const tableNames = payload.preferredTableName
    ? [payload.preferredTableName, ...CHALLENGE_SUBMISSION_TABLES.filter((tableName) => tableName !== payload.preferredTableName)]
    : [...CHALLENGE_SUBMISSION_TABLES]

  const basePayload = {
    challenge_id: payload.challenge_id,
    student_id: payload.student_id,
    student_name: payload.student_name,
    is_correct: payload.is_correct,
  }

  let lastError: any = null

  for (const tableName of tableNames) {
    for (const shape of CHALLENGE_SOLUTION_WRITE_SHAPES) {
      const attempt = {
        ...basePayload,
        [shape.answerKey]: payload.answerValue,
        [shape.timeKey]: payload.solved_at,
        [shape.pointsKey]: payload.is_correct ? undefined : 0,
      }

      const sanitizedAttempt = Object.fromEntries(Object.entries(attempt).filter(([, value]) => value !== undefined))
      try {
        const { error } = await supabase.from(tableName).insert(sanitizedAttempt)

        if (!error) {
          return { tableName }
        }

        if (isMissingSubmissionStorageError(error)) {
          continue
        }

        lastError = error
      } catch (error) {
        if (isMissingSubmissionStorageError(error)) {
          continue
        }

        lastError = error
      }
    }
  }

  if (isMissingSubmissionStorageError(lastError)) {
    return { tableName: undefined }
  }

  throw lastError
}

async function updateChallengeSolution(
  supabase: ReturnType<typeof createAdminClient>,
  solutionId: string,
  payload: {
    answerValue: string
    is_correct: boolean
    solved_at: string
    tableName?: ChallengeSubmissionTable
  },
) {
  const tableNames = payload.tableName
    ? [payload.tableName, ...CHALLENGE_SUBMISSION_TABLES.filter((tableName) => tableName !== payload.tableName)]
    : [...CHALLENGE_SUBMISSION_TABLES]

  let lastError: any = null

  for (const tableName of tableNames) {
    for (const shape of CHALLENGE_SOLUTION_WRITE_SHAPES) {
      const attempt = {
        [shape.answerKey]: payload.answerValue,
        is_correct: payload.is_correct,
        [shape.timeKey]: payload.solved_at,
        [shape.pointsKey]: payload.is_correct ? undefined : 0,
      }

      const sanitizedAttempt = Object.fromEntries(Object.entries(attempt).filter(([, value]) => value !== undefined))
      try {
        const { error } = await supabase.from(tableName).update(sanitizedAttempt).eq("id", solutionId)

        if (!error) {
          return { tableName }
        }

        if (isMissingSubmissionStorageError(error)) {
          continue
        }

        lastError = error
      } catch (error) {
        if (isMissingSubmissionStorageError(error)) {
          continue
        }

        lastError = error
      }
    }
  }

  if (isMissingSubmissionStorageError(lastError)) {
    return { tableName: undefined }
  }

  throw lastError
}

function getFallbackChallengeForDate(dateString: string) {
  const startDate = new Date("2024-01-01")
  const today = new Date(dateString)
  const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  return fallbackChallenges[((diffDays % fallbackChallenges.length) + fallbackChallenges.length) % fallbackChallenges.length]
}

async function ensureTodayChallenge(supabase: ReturnType<typeof createAdminClient>, todayDate: string, challengeId?: string) {
  let query = supabase
    .from("daily_challenges")
    .select("id, title, points_reward")
    .eq("date", todayDate)
    .limit(1)

  if (challengeId) {
    query = query.eq("id", challengeId)
  }

  const { data: existingChallenge, error: existingChallengeError } = await query.maybeSingle()

  if (existingChallengeError) {
    throw existingChallengeError
  }

  if (existingChallenge) {
    return existingChallenge
  }

  const fallbackChallenge = getFallbackChallengeForDate(todayDate)

  const challengeInsertAttempts = [
    {
      date: todayDate,
      type: fallbackChallenge.type,
      title: fallbackChallenge.title,
      description: fallbackChallenge.description,
      correct_answer: "fallback",
      points_reward: fallbackChallenge.points_reward,
    },
    {
      date: todayDate,
      challenge_type: fallbackChallenge.type,
      title: fallbackChallenge.title,
      description: fallbackChallenge.description,
      correct_answer: "fallback",
      points_reward: fallbackChallenge.points_reward,
    },
  ]

  let createdChallenge: { id: string; title: string; points_reward: number | null } | null = null
  let createChallengeError: any = null

  for (const challengeAttempt of challengeInsertAttempts) {
    const { data, error } = await supabase
      .from("daily_challenges")
      .insert(challengeAttempt)
      .select("id, title, points_reward")
      .single()

    if (!error && data) {
      createdChallenge = data
      createChallengeError = null
      break
    }

    createChallengeError = error
  }

  if (createChallengeError) {
    const { data: retryChallenge, error: retryChallengeError } = await supabase
      .from("daily_challenges")
      .select("id, title, points_reward")
      .eq("date", todayDate)
      .limit(1)
      .maybeSingle()

    if (retryChallengeError || !retryChallenge) {
      throw createChallengeError
    }

    return retryChallenge
  }

  return createdChallenge
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["student"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
    const todayDate = getKsaDateString()
    const cookieAttempts = await getDailyChallengeAttemptsFromCookieHeader(request.headers.get("cookie"))

    const challenge = await ensureTodayChallenge(supabase, todayDate)

    const { data: existingSolution } = await findExistingSolution(supabase, challenge.id, session.id)
    const existingCookieAttempt = findChallengeAttempt(cookieAttempts, session.id, todayDate)

    return NextResponse.json({
      playedToday: Boolean(existingSolution || existingCookieAttempt),
      isCorrect: existingSolution?.is_correct ?? existingCookieAttempt?.isCorrect ?? null,
      todayDate,
    })
  } catch (error) {
    console.error("[v0] Error fetching daily challenge status:", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ["student"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()

    const body = await request.json()
    const { challengeId, answer, isCorrect, action } = body

    const todayDate = getKsaDateString()
    const cookieAttempts = await getDailyChallengeAttemptsFromCookieHeader(request.headers.get("cookie"))

    const challenge = await ensureTodayChallenge(supabase, todayDate, challengeId)

    const { data: existingSolution, tableName: existingSolutionTableName } = await findExistingSolution(
      supabase,
      challenge.id,
      session.id,
    )
    const existingCookieAttempt = findChallengeAttempt(cookieAttempts, session.id, todayDate)
    const canUseDatabaseStorage = Boolean(existingSolutionTableName)

    if (action === "start") {
      if (existingSolution || existingCookieAttempt) {
        return NextResponse.json({
          success: false,
          alreadySolved: true,
          isCorrect: existingSolution?.is_correct ?? existingCookieAttempt?.isCorrect ?? false,
          message: "تم تسجيل محاولتك اليوم بالفعل",
        })
      }

      if (!canUseDatabaseStorage) {
        const challengeAttemptCookie = await buildChallengeAttemptCookieValue(cookieAttempts, {
          studentId: session.id,
          date: todayDate,
          challengeId: challenge.id,
          isCorrect: false,
          status: "started",
          updatedAt: Date.now(),
        })

        return withChallengeAttemptCookie(
          NextResponse.json({
            success: true,
            started: true,
            message: "تم تسجيل بداية التحدي لليوم",
          }),
          challengeAttemptCookie,
        )
      }

      try {
        const startAttempt = await insertChallengeSolution(supabase, {
          challenge_id: challenge.id,
          student_id: session.id,
          student_name: session.name,
          answerValue: PENDING_ANSWER_MARKER,
          is_correct: false,
          preferredTableName: existingSolutionTableName,
        })

        if (!startAttempt.tableName) {
          const challengeAttemptCookie = await buildChallengeAttemptCookieValue(cookieAttempts, {
            studentId: session.id,
            date: todayDate,
            challengeId: challenge.id,
            isCorrect: false,
            status: "started",
            updatedAt: Date.now(),
          })

          return withChallengeAttemptCookie(
            NextResponse.json({
              success: true,
              started: true,
              message: "تم تسجيل بداية التحدي لليوم",
            }),
            challengeAttemptCookie,
          )
        }
      } catch (startError) {
        console.error("[daily-challenge] Failed to register start attempt:", startError)
        return NextResponse.json({ error: "تعذر بدء محاولة التحدي" }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        started: true,
        message: "تم تسجيل بداية التحدي لليوم",
      })
    }

    if (!canUseDatabaseStorage) {
      if (existingCookieAttempt && existingCookieAttempt.status === "completed") {
        return NextResponse.json({
          success: existingCookieAttempt.isCorrect,
          alreadySolved: true,
          isCorrect: existingCookieAttempt.isCorrect,
          pointsAwarded: existingCookieAttempt.isCorrect ? challenge.points_reward || 0 : 0,
          message: existingCookieAttempt.isCorrect ? "تم احتساب نتيجة التحدي مسبقًا" : "تم تسجيل محاولتك مسبقًا",
        })
      }

      const normalizedCorrect = Boolean(isCorrect)

      if (normalizedCorrect) {
        const pointsAwarded = challenge.points_reward || 0
        const { data: studentData } = await supabase
          .from("students")
          .select("points, store_points")
          .eq("id", session.id)
          .maybeSingle()

        await supabase
          .from("students")
          .update({
            points: (studentData?.points || 0) + pointsAwarded,
            store_points: (studentData?.store_points || 0) + pointsAwarded,
          })
          .eq("id", session.id)
      }

      const challengeAttemptCookie = await buildChallengeAttemptCookieValue(cookieAttempts, {
        studentId: session.id,
        date: todayDate,
        challengeId: challenge.id,
        isCorrect: normalizedCorrect,
        status: "completed",
        updatedAt: Date.now(),
      })

      return withChallengeAttemptCookie(
        NextResponse.json(
          normalizedCorrect
            ? {
                success: true,
                isCorrect: true,
                pointsAwarded: challenge.points_reward || 0,
                message: `مبروك! حصلت على ${challenge.points_reward || 0} نقطة`,
              }
            : {
                success: false,
                isCorrect: false,
                pointsAwarded: 0,
                message: "تم تسجيل المحاولة، حاول مرة أخرى غداً",
              },
        ),
        challengeAttemptCookie,
      )
    }

    if (existingSolution) {
      if (!existingSolution.is_correct && isPendingSolution(existingSolution)) {
        const normalizedCorrect = Boolean(isCorrect)
        const finalizedAnswer = answer
          ? JSON.stringify(answer)
          : normalizedCorrect
            ? JSON.stringify({ result: "success" })
            : JSON.stringify({ result: "failed" })

        try {
          const updatedAttempt = await updateChallengeSolution(supabase, existingSolution.id, {
            answerValue: finalizedAnswer,
            is_correct: normalizedCorrect,
            solved_at: new Date().toISOString(),
            tableName: existingSolutionTableName,
          })

          if (!updatedAttempt.tableName) {
            if (normalizedCorrect) {
              const pointsAwarded = challenge.points_reward || 0
              const { data: studentData } = await supabase
                .from("students")
                .select("points, store_points")
                .eq("id", session.id)
                .maybeSingle()

              await supabase
                .from("students")
                .update({
                  points: (studentData?.points || 0) + pointsAwarded,
                  store_points: (studentData?.store_points || 0) + pointsAwarded,
                })
                .eq("id", session.id)
            }

            const challengeAttemptCookie = await buildChallengeAttemptCookieValue(cookieAttempts, {
              studentId: session.id,
              date: todayDate,
              challengeId: challenge.id,
              isCorrect: normalizedCorrect,
              status: "completed",
              updatedAt: Date.now(),
            })

            return withChallengeAttemptCookie(
              NextResponse.json(
                normalizedCorrect
                  ? {
                      success: true,
                      isCorrect: true,
                      pointsAwarded: challenge.points_reward || 0,
                      message: `مبروك! حصلت على ${challenge.points_reward || 0} نقطة`,
                    }
                  : {
                      success: false,
                      isCorrect: false,
                      pointsAwarded: 0,
                      message: "تم تسجيل المحاولة، حاول مرة أخرى غداً",
                    },
              ),
              challengeAttemptCookie,
            )
          }
        } catch (updateError) {
          console.error("[daily-challenge] Failed to finalize reserved attempt:", updateError)
          return NextResponse.json({ error: "تعذر تحديث محاولة التحدي" }, { status: 500 })
        }

        if (normalizedCorrect) {
          const pointsAwarded = challenge.points_reward || 0
          const { data: studentData } = await supabase
            .from("students")
            .select("points, store_points")
            .eq("id", session.id)
            .maybeSingle()

          await supabase
            .from("students")
            .update({
              points: (studentData?.points || 0) + pointsAwarded,
              store_points: (studentData?.store_points || 0) + pointsAwarded,
            })
            .eq("id", session.id)

          return NextResponse.json({
            success: true,
            isCorrect: true,
            pointsAwarded,
            message: `مبروك! حصلت على ${pointsAwarded} نقطة`,
          })
        }

        return NextResponse.json({
          success: false,
          isCorrect: false,
          pointsAwarded: 0,
          message: "تم تسجيل المحاولة، حاول مرة أخرى غداً",
        })
      }

      return NextResponse.json({
        success: existingSolution.is_correct,
        alreadySolved: true,
        isCorrect: existingSolution.is_correct,
        pointsAwarded: existingSolution.is_correct ? challenge.points_reward || 0 : 0,
        message: existingSolution.is_correct ? "تم احتساب نتيجة التحدي مسبقًا" : "تم تسجيل محاولتك مسبقًا",
      })
    }

    const normalizedCorrect = Boolean(isCorrect)

    try {
      const savedAttempt = await insertChallengeSolution(supabase, {
        challenge_id: challenge.id,
        student_id: session.id,
        student_name: session.name,
        answerValue: answer
          ? JSON.stringify(answer)
          : normalizedCorrect
            ? JSON.stringify({ result: "success" })
            : JSON.stringify({ result: "failed" }),
        is_correct: normalizedCorrect,
        solved_at: new Date().toISOString(),
        preferredTableName: existingSolutionTableName,
      })

      if (!savedAttempt.tableName) {
        if (normalizedCorrect) {
          const pointsAwarded = challenge.points_reward || 0
          const { data: studentData } = await supabase
            .from("students")
            .select("points, store_points")
            .eq("id", session.id)
            .maybeSingle()

          await supabase
            .from("students")
            .update({
              points: (studentData?.points || 0) + pointsAwarded,
              store_points: (studentData?.store_points || 0) + pointsAwarded,
            })
            .eq("id", session.id)
        }

        const challengeAttemptCookie = await buildChallengeAttemptCookieValue(cookieAttempts, {
          studentId: session.id,
          date: todayDate,
          challengeId: challenge.id,
          isCorrect: normalizedCorrect,
          status: "completed",
          updatedAt: Date.now(),
        })

        return withChallengeAttemptCookie(
          NextResponse.json(
            normalizedCorrect
              ? {
                  success: true,
                  isCorrect: true,
                  pointsAwarded: challenge.points_reward || 0,
                  message: `مبروك! حصلت على ${challenge.points_reward || 0} نقطة`,
                }
              : {
                  success: false,
                  isCorrect: false,
                  pointsAwarded: 0,
                  message: "تم تسجيل المحاولة، حاول مرة أخرى غداً",
                },
          ),
          challengeAttemptCookie,
        )
      }
    } catch (insertError) {
      console.error("[daily-challenge] Failed to save challenge solution:", insertError)
      return NextResponse.json({ error: "تعذر حفظ محاولة التحدي" }, { status: 500 })
    }

    if (normalizedCorrect) {
      const pointsAwarded = challenge.points_reward || 0
      const { data: studentData } = await supabase
        .from("students")
        .select("points, store_points")
        .eq("id", session.id)
        .maybeSingle()

      await supabase
        .from("students")
        .update({
          points: (studentData?.points || 0) + pointsAwarded,
          store_points: (studentData?.store_points || 0) + pointsAwarded,
        })
        .eq("id", session.id)

      return NextResponse.json({
        success: true,
        isCorrect: true,
        pointsAwarded,
        message: `مبروك! حصلت على ${pointsAwarded} نقطة`,
      })
    }

    return NextResponse.json({
      success: false,
      isCorrect: false,
      pointsAwarded: 0,
      message: "تم تسجيل المحاولة، حاول مرة أخرى غداً",
    })
  } catch (error) {
    console.error("[v0] Error:", error)
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 })
  }
}
