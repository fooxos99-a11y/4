import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getSaudiDateString } from "@/lib/saudi-time"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teacherId = searchParams.get("teacher_id")
    const date = searchParams.get("date")

    console.log("[v0] GET teacher-attendance:", { teacherId, date })

    if (!teacherId || !date) {
      return NextResponse.json({ error: "teacher_id and date are required" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("teacher_attendance")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("attendance_date", date)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching teacher attendance:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[v0] Attendance record found:", !!data)

    return NextResponse.json({
      exists: !!data,
      record: data,
    })
  } catch (error) {
    console.error("[v0] Error in teacher attendance GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("[v0] POST teacher-attendance body:", body)

    const { teacher_id, teacher_name, account_number, status, check_in_time } = body

    if (!teacher_id) {
      console.error("[v0] Missing teacher_id")
      return NextResponse.json({ error: "معرف المعلم مطلوب" }, { status: 400 })
    }
    if (!teacher_name) {
      console.error("[v0] Missing teacher_name")
      return NextResponse.json({ error: "اسم المعلم مطلوب" }, { status: 400 })
    }
    if (!account_number) {
      console.error("[v0] Missing account_number")
      return NextResponse.json({ error: "رقم الحساب مطلوب" }, { status: 400 })
    }
    // </CHANGE>

    const supabase = await createClient()

    // Get today's date
    const attendanceDate = getSaudiDateString()

    const attendanceRecord = {
      teacher_id,
      teacher_name,
      account_number: Number(account_number),
      attendance_date: attendanceDate,
      status: status || "present",
      check_in_time: check_in_time || new Date().toISOString(),
    }

    console.log("[v0] Upserting attendance record:", attendanceRecord)

    const { data, error } = await supabase
      .from("teacher_attendance")
      .upsert(attendanceRecord, {
        onConflict: "teacher_id,attendance_date",
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating teacher attendance:", error)
      return NextResponse.json(
        {
          error: error.message || "فشل في تسجيل الحضور",
          details: error,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Attendance record created successfully:", data)
    // </CHANGE>

    return NextResponse.json({
      success: true,
      record: data,
    })
  } catch (error) {
    console.error("[v0] Error in teacher attendance POST:", error)
    return NextResponse.json(
      {
        error: "حدث خطأ في الخادم",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
