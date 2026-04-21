import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { ensureStudentAccess, requireRoles } from "@/lib/auth/guards"

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

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: "لم يتم العثور على الطالب" }, { status: 404 })
    }

    const { data: allStudents, error: allError } = await supabase
      .from("students")
      .select("id, points")
      .order("points", { ascending: false })

    if (allError) {
      console.error("[v0] Error fetching all students:", allError)
      return NextResponse.json({ error: "فشل في حساب الترتيب" }, { status: 500 })
    }

    const globalRank = allStudents?.findIndex((s) => s.id === studentId) + 1 || 0

    const { data: circleStudents, error: circleError } = await supabase
      .from("students")
      .select("id, points")
      .eq("halaqah", student.halaqah)
      .order("points", { ascending: false })

    if (circleError) {
      console.error("[v0] Error fetching circle students:", circleError)
      return NextResponse.json({ error: "فشل في حساب ترتيب الحلقة" }, { status: 500 })
    }

    const circleRank = circleStudents?.findIndex((s) => s.id === studentId) + 1 || 0
    const circleSize = circleStudents?.length || 0

    console.log(`[v0] Ranking - Student: ${student.name}, Global: ${globalRank}, Circle: ${circleRank}/${circleSize}`)

    return NextResponse.json(
      {
        success: true,
        ranking: {
          globalRank,
          circleRank,
          circleSize,
          circleName: student.halaqah,
          points: student.points,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Error in GET /api/student-ranking:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}
