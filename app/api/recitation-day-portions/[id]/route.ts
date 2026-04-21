import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRoles } from "@/lib/auth/guards"
import { getSiteSetting } from "@/lib/site-settings"
import {
  calculateRecitationDayPortionGrade,
  DEFAULT_RECITATION_DAY_GRADING_SETTINGS_VALUE,
  normalizeRecitationDayGradingSettings,
  RECITATION_DAY_GRADING_SETTINGS_ID,
} from "@/lib/recitation-day-grading-settings"

function derivePortionStatus(payload: {
  grade: number | null
  errors_count: number
  alerts_count: number
  notes: string | null
}) {
  if (payload.grade !== null || payload.errors_count > 0 || payload.alerts_count > 0 || payload.notes) {
    return "partial"
  }

  return "not_listened"
}

function parseNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRoles(request, ["admin", "supervisor"])
  if ("response" in auth) {
    return auth.response
  }

  const { id } = await context.params
  const body = await request.json()
  const supabase = createAdminClient()
  const gradingSettings = normalizeRecitationDayGradingSettings(
    await getSiteSetting(RECITATION_DAY_GRADING_SETTINGS_ID, DEFAULT_RECITATION_DAY_GRADING_SETTINGS_VALUE),
  )

  const nextPayload = {
    errors_count: Math.max(0, Number(body.errors_count || 0)),
    alerts_count: Math.max(0, Number(body.alerts_count || 0)),
    notes: String(body.notes || "").trim() || null,
  }

  const nextGrade = calculateRecitationDayPortionGrade({
    errorsCount: nextPayload.errors_count,
    alertsCount: nextPayload.alerts_count,
    settings: gradingSettings,
  })

  const payload = {
    status: derivePortionStatus({ ...nextPayload, grade: nextGrade }),
    evaluator_name: null,
    heard_amount_text: null,
    grade: nextGrade,
    ...nextPayload,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("recitation_day_portions")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message || "تعذر تحديث تقييم الجزء" }, { status: 500 })
  }

  return NextResponse.json({ portion: data })
}