import { requireRoles } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }
  return String(error)
}

function normalizeCircleName(value: unknown) {
  return String(value || "").trim()
}

// Enable route caching for 30 seconds
export const revalidate = 30

// GET all circles
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data: circles, error: circlesError } = await supabase
      .from("circles")
      .select("id, name, created_at")
      .order("created_at", { ascending: true })

    if (circlesError) throw circlesError

    // Get student counts for each circle
    const { data: students, error: studentsError } = await supabase.from("students").select("halaqah")

    if (studentsError) throw studentsError

    // Count students per circle
    const studentCounts = new Map()
    students?.forEach((student) => {
      const normalizedHalaqah = normalizeCircleName(student.halaqah)
      if (normalizedHalaqah) {
        studentCounts.set(normalizedHalaqah, (studentCounts.get(normalizedHalaqah) || 0) + 1)
      }
    })

    const circlesWithCounts = circles?.map((circle) => ({
      id: circle.id,
      name: circle.name,
      studentCount: studentCounts.get(normalizeCircleName(circle.name)) || 0,
      created_at: circle.created_at,
    }))

    return NextResponse.json(
      { circles: circlesWithCounts || [] },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
        }
      }
    )
  } catch (error) {
    console.error("[v0] Error fetching circles:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

// POST - Add a new circle
export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { name } = await request.json()
    const normalizedName = normalizeCircleName(name)

    if (!normalizedName) {
      return NextResponse.json({ error: "اسم الحلقة مطلوب" }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase.from("circles").insert({ name: normalizedName }).select().single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "حلقة بهذا الاسم موجودة بالفعل" }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ success: true, circle: data })
  } catch (error) {
    console.error("[v0] Error adding circle:", error)
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
    const currentName = normalizeCircleName(body.current_name)
    const nextName = normalizeCircleName(body.new_name)

    if (!currentName || !nextName) {
      return NextResponse.json({ error: "الاسم الحالي والجديد مطلوبان" }, { status: 400 })
    }

    if (currentName === nextName) {
      return NextResponse.json({ success: true })
    }

    const supabase = createAdminClient()

    const { data: existingCircle, error: existingCircleError } = await supabase
      .from("circles")
      .select("id")
      .eq("name", currentName)
      .maybeSingle()

    if (existingCircleError) throw existingCircleError
    if (!existingCircle) {
      return NextResponse.json({ error: "الحلقة غير موجودة" }, { status: 404 })
    }

    const { data: duplicateCircle, error: duplicateError } = await supabase
      .from("circles")
      .select("id")
      .eq("name", nextName)
      .maybeSingle()

    if (duplicateError) throw duplicateError
    if (duplicateCircle) {
      return NextResponse.json({ error: "حلقة بهذا الاسم موجودة بالفعل" }, { status: 400 })
    }

    const { error: updateCircleError } = await supabase.from("circles").update({ name: nextName }).eq("name", currentName)
    if (updateCircleError) throw updateCircleError

    const tablesToSync = [
      "students",
      "users",
      "attendance_records",
      "recitation_days",
      "recitation_day_students",
    ]

    for (const tableName of tablesToSync) {
      const { error } = await supabase.from(tableName).update({ halaqah: nextName }).eq("halaqah", currentName)
      if (error) {
        throw error
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error renaming circle:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

// DELETE - Remove a circle
export async function DELETE(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { searchParams } = new URL(request.url)
    const circleName = normalizeCircleName(searchParams.get("name"))

    if (!circleName) {
      return NextResponse.json({ error: "اسم الحلقة مطلوب" }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Delete all students in this circle
    const { error: studentsError } = await supabase.from("students").delete().eq("halaqah", circleName)

    if (studentsError) throw studentsError

    // Delete all attendance records for this circle
    const { error: attendanceError } = await supabase.from("attendance_records").delete().eq("halaqah", circleName)

    if (attendanceError) throw attendanceError

    // Update teachers assigned to this circle
    const { error: usersError } = await supabase.from("users").update({ halaqah: null }).eq("halaqah", circleName)

    if (usersError) throw usersError

    const { error: circleError } = await supabase.from("circles").delete().eq("name", circleName)

    if (circleError) throw circleError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting circle:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
