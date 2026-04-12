import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const ENROLLMENT_STATUS_PROGRAM_ID = "00000000-0000-0000-0000-000000000000"

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
}

function isMissingSupabaseEnvironment(error: unknown) {
  return /supabase environment variables are not set/i.test(getErrorMessage(error))
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("programs")
      .select("is_active")
      .eq("id", ENROLLMENT_STATUS_PROGRAM_ID)
      .maybeSingle()

    if (error) {
      throw error
    }

    return NextResponse.json({ isEnrollmentOpen: data?.is_active ?? true })
  } catch (error) {
    if (isMissingSupabaseEnvironment(error)) {
      return NextResponse.json({ isEnrollmentOpen: true, isSupabaseConfigured: false })
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const fullName = String(body.fullName || "").trim()
    const guardianPhone = String(body.guardianPhone || "").trim()
    const idNumber = String(body.idNumber || "").trim()
    const educationalStage = String(body.educationalStage || "").trim()
    const memorizedAmount = String(body.memorizedAmount || "").trim()
    const selectedJuzs = Array.isArray(body.selectedJuzs)
      ? body.selectedJuzs.map((value: unknown) => Number(value)).filter((value: number) => Number.isInteger(value) && value >= 1 && value <= 30)
      : []

    if (!fullName || !guardianPhone || !idNumber || !educationalStage || !memorizedAmount || selectedJuzs.length === 0) {
      return NextResponse.json({ error: "جميع الحقول المطلوبة يجب تعبئتها" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: statusData, error: statusError } = await supabase
      .from("programs")
      .select("is_active")
      .eq("id", ENROLLMENT_STATUS_PROGRAM_ID)
      .maybeSingle()

    if (statusError) {
      throw statusError
    }

    if (statusData && statusData.is_active === false) {
      return NextResponse.json({ error: "عذرًا، التسجيل مغلق حاليًا" }, { status: 403 })
    }

    const { error } = await supabase.from("enrollment_requests").insert([
      {
        full_name: fullName,
        guardian_phone: guardianPhone,
        id_number: idNumber,
        educational_stage: educationalStage,
        memorized_amount: memorizedAmount,
        selected_juzs: selectedJuzs,
      },
    ])

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isMissingSupabaseEnvironment(error)) {
      return NextResponse.json({ error: "إعدادات قاعدة البيانات غير مهيأة في هذه البيئة المحلية بعد" }, { status: 503 })
    }

    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}