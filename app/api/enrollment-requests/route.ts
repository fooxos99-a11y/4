import { NextResponse } from "next/server"

import { requireRoles } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"

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

export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = createAdminClient()
    const [requestsResult, statusResult] = await Promise.all([
      supabase.from("enrollment_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("programs").select("is_active").eq("id", ENROLLMENT_STATUS_PROGRAM_ID).maybeSingle(),
    ])

    if (requestsResult.error) {
      throw requestsResult.error
    }

    if (statusResult.error) {
      throw statusResult.error
    }

    return NextResponse.json({
      requests: requestsResult.data || [],
      isEnrollmentOpen: statusResult.data?.is_active ?? true,
    })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json()
    const action = String(body.action || "").trim()
    const supabase = createAdminClient()

    if (action === "update-test-results") {
      const requestId = String(body.requestId || "").trim()
      if (!requestId) {
        return NextResponse.json({ error: "معرف الطلب مطلوب" }, { status: 400 })
      }

      const { error } = await supabase
        .from("enrollment_requests")
        .update({
          test_reviewed: true,
          juz_test_results: body.juzTestResults || {},
          juz_review_results: body.juzReviewResults || {},
        })
        .eq("id", requestId)

      if (error) {
        throw error
      }

      return NextResponse.json({ success: true })
    }

    if (action === "toggle-status") {
      const isActive = Boolean(body.isActive)
      const { error } = await supabase.from("programs").upsert({
        id: ENROLLMENT_STATUS_PROGRAM_ID,
        name: "ENROLLMENT_STATUS",
        is_active: isActive,
        date: "status",
        duration: "status",
        points: 0,
        description: "ENROLLMENT_STATUS",
      })

      if (error) {
        throw error
      }

      return NextResponse.json({ success: true, isEnrollmentOpen: isActive })
    }

    return NextResponse.json({ error: "عملية غير مدعومة" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { searchParams } = new URL(request.url)
    const id = String(searchParams.get("id") || "").trim()
    if (!id) {
      return NextResponse.json({ error: "معرف الطلب مطلوب" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from("enrollment_requests").delete().eq("id", id)
    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}