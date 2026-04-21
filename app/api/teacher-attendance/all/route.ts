import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getBuraidahAsrTime, getTeacherAttendanceTimingStatus } from "@/lib/prayer-times"
import { getTeacherAttendanceDelayMinutes } from "@/lib/site-settings"
import { getSaudiDateString } from "@/lib/saudi-time"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const graceMinutes = await getTeacherAttendanceDelayMinutes()
    const saudiToday = getSaudiDateString()
    const todayAsrTime = await getBuraidahAsrTime(saudiToday)

    const { data, error } = await supabase
      .from("teacher_attendance")
      .select("*")
      .order("attendance_date", { ascending: false })
      .order("check_in_time", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching all teacher attendance:", error)
      return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 })
    }

    const recordsWithTiming = await Promise.all(
      (data || []).map(async (record) => {
        try {
          const timing = await getTeacherAttendanceTimingStatus(record, graceMinutes)
          return {
            ...record,
            ...timing,
          }
        } catch (timingError) {
          console.error("[teacher-attendance/all] Error enriching timing status:", timingError)
          return {
            ...record,
            asrTime: null,
            graceDeadline: null,
            checkInTimeLocal: null,
            isLate: null,
            isEarly: null,
            isOnTime: null,
            timingCategory: null,
            lateMinutes: null,
            city: "بريدة",
            graceMinutes,
            source: "Almosaly",
          }
        }
      }),
    )

    return NextResponse.json({
      records: recordsWithTiming,
      meta: {
        city: "بريدة",
        graceMinutes,
        todayAsrTime,
        todayDate: saudiToday,
      },
    })
  } catch (error) {
    console.error("[v0] Error in teacher attendance all GET:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
