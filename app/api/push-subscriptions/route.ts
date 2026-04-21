import { NextResponse } from "next/server"

import { requireRoles } from "@/lib/auth/guards"
import { getWebPushPublicKey, removePushSubscription, savePushSubscription } from "@/lib/push-notifications"

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
}

export async function GET() {
  const publicKey = getWebPushPublicKey()
  return NextResponse.json({
    configured: Boolean(publicKey),
    publicKey: publicKey || null,
  })
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["student", "teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json()
    const subscription = body?.subscription

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "بيانات الجهاز غير صالحة" }, { status: 400 })
    }

    await savePushSubscription({
      accountNumber: auth.session.accountNumber,
      subscription,
      userAgent: String(body?.userAgent || "").trim() || null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[push-subscriptions] POST:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRoles(request, ["student", "teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json()
    const endpoint = String(body?.endpoint || "").trim()
    const forceCurrentDevice = Boolean(body?.forceCurrentDevice)
    if (!endpoint) {
      return NextResponse.json({ error: "المعرّف غير صالح" }, { status: 400 })
    }

    const removedForAccount = await removePushSubscription(endpoint, auth.session.accountNumber)
    if (removedForAccount === 0 && forceCurrentDevice) {
      await removePushSubscription(endpoint)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[push-subscriptions] DELETE:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
