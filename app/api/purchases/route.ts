import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { ensureStudentAccess, requireRoles } from "@/lib/auth/guards"

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["student", "teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
    const body = await request.json()
    const { student_id, product_id, price } = body

    console.log("[v0] POST /api/purchases - Received data:", { student_id, product_id, price })

    if (!student_id || !product_id || price === undefined) {
      return NextResponse.json({ error: "البيانات المطلوبة ناقصة" }, { status: 400 })
    }

    const normalizedPrice = Number(price)
    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      return NextResponse.json({ error: "سعر المنتج غير صالح" }, { status: 400 })
    }

    const studentAccess = await ensureStudentAccess(supabase, session, student_id)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    // Check if already purchased
    const { data: existing } = await supabase
      .from("purchases")
      .select("id")
      .eq("student_id", student_id)
      .eq("product_id", product_id)
      .single()

    if (existing) {
      // Already purchased – return current points without deducting again
      const { data: student } = await supabase.from("students").select("points").eq("id", student_id).single()
      return NextResponse.json({ success: true, remaining_points: student?.points ?? 0, already_owned: true }, { status: 200 })
    }

    // Check if student has enough points
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("points")
      .eq("id", student_id)
      .single()

    if (studentError || !student) {
      console.error("[v0] Error fetching student:", studentError)
      return NextResponse.json({ error: "لم يتم العثور على الطالب" }, { status: 404 })
    }

    if (student.points < price) {
      return NextResponse.json({ error: "نقاط غير كافية" }, { status: 400 })
    }

    const newPoints = student.points - normalizedPrice
    const { error: updateError } = await supabase.from("students").update({ points: newPoints }).eq("id", student_id)

    if (updateError) {
      console.error("[v0] Error updating student points:", updateError)
      return NextResponse.json({ error: "فشل في تحديث النقاط" }, { status: 500 })
    }

    // Record the purchase in Supabase so it is available across all devices
    const { error: insertError } = await supabase
      .from("purchases")
      .insert({ student_id, product_id, price: normalizedPrice })

    if (insertError) {
      console.error("[v0] Error inserting purchase record:", insertError)
      // Non-fatal: points already deducted, log and continue
    }

    console.log("[v0] Purchase successful:", { student_id, product_id, remaining_points: newPoints })

    return NextResponse.json(
      {
        success: true,
        remaining_points: newPoints,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Error in POST /api/purchases:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["student", "teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("student_id")

    if (!studentId) {
      return NextResponse.json({ error: "معرف الطالب مطلوب" }, { status: 400 })
    }

    const studentAccess = await ensureStudentAccess(supabase, session, studentId)
    if ("response" in studentAccess) {
      return studentAccess.response
    }

    const { data, error } = await supabase
      .from("purchases")
      .select("product_id")
      .eq("student_id", studentId)

    if (error) {
      console.error("[v0] Error fetching purchases:", error)
      return NextResponse.json({ purchases: [] }, { status: 200 })
    }

    const purchases = (data || []).map((row: { product_id: string }) => row.product_id)

    // أحضر أيضاً الطلبات من المتجر الجديد والتي تحتوي على theme_key
    const { data: storeOrders } = await supabase
      .from("store_orders")
      .select(`
        product_id,
        store_products (
          theme_key
        )
      `)
      .eq("student_id", studentId)

    if (storeOrders) {
      storeOrders.forEach((order: any) => {
        if (order.store_products && order.store_products.theme_key) {
          const themeId = `theme_${order.store_products.theme_key}`;
          if (!purchases.includes(themeId)) {
            purchases.push(themeId);
          }
        }
      });
    }

    return NextResponse.json({ purchases }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in GET /api/purchases:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}
