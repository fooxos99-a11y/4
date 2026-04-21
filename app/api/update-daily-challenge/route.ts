import { NextRequest, NextResponse } from "next/server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

function getSaudiDateString() {
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

function getFallbackChallengeForDate(dateString: string) {
  const startDate = new Date("2024-01-01")
  const today = new Date(dateString)
  const diffDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  return fallbackChallenges[((diffDays % fallbackChallenges.length) + fallbackChallenges.length) % fallbackChallenges.length]
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

async function ensureTodayChallenge() {
  const supabase = createAdminClient()
  const todayDate = getSaudiDateString()

  const { data: existingChallenge, error: existingChallengeError } = await supabase
    .from("daily_challenges")
    .select("*")
    .eq("date", todayDate)
    .limit(1)
    .maybeSingle()

  if (existingChallengeError) {
    throw existingChallengeError
  }

  if (existingChallenge) {
    return { created: false, todayDate, challenge: existingChallenge }
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

  let createdChallenge: Record<string, unknown> | null = null
  let createChallengeError: unknown = null

  for (const challengeAttempt of challengeInsertAttempts) {
    const { data, error } = await supabase
      .from("daily_challenges")
      .insert(challengeAttempt)
      .select("*")
      .single()

    if (!error && data) {
      createdChallenge = data
      createChallengeError = null
      break
    }

    createChallengeError = error
  }

  if (!createdChallenge && createChallengeError) {
    const { data: retryChallenge, error: retryChallengeError } = await supabase
      .from("daily_challenges")
      .select("*")
      .eq("date", todayDate)
      .limit(1)
      .maybeSingle()

    if (retryChallengeError || !retryChallenge) {
      throw createChallengeError
    }

    return { created: false, todayDate, challenge: retryChallenge }
  }

  return { created: true, todayDate, challenge: createdChallenge }
}

async function handleRequest(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await ensureTodayChallenge()
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[cron][update-daily-challenge]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "حدث خطأ غير معروف" },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}