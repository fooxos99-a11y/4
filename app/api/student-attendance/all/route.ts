import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const supabase = await createClient()

  // جلب جميع الطلاب
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, name, account_number, halaqah")
    .order("account_number", { ascending: true })

  if (studentsError) {
    return NextResponse.json({ error: "فشل في جلب الطلاب" }, { status: 500 })
  }

  // جلب جميع سجلات الحضور
  const { data: attendance, error: attendanceError } = await supabase
    .from("attendance_records")
    .select("id, student_id, date, status, created_at, notes, is_compensation")

  if (attendanceError) {
    return NextResponse.json({ error: "فشل في جلب سجلات الحضور" }, { status: 500 })
  }

  // دعم فلترة حسب تاريخ محدد (يأتي من الكويري باراميتر)
  // إذا لم يوجد باراميتر، استخدم تاريخ اليوم بتوقيت السعودية
  const url = new URL(request.url)
  let selectedDate = url.searchParams.get("date")
  if (!selectedDate) {
    selectedDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date())
  }


  // جلب جميع التقييمات لهذا اليوم
  const { data: evaluations, error: evalError } = await supabase
    .from("evaluations")
    .select("attendance_record_id, hafiz_level, tikrar_level, samaa_level, rabet_level, hafiz_from_surah, hafiz_from_verse, hafiz_to_surah, hafiz_to_verse, samaa_from_surah, samaa_from_verse, samaa_to_surah, samaa_to_verse, rabet_from_surah, rabet_from_verse, rabet_to_surah, rabet_to_verse")

  if (evalError) {
    console.error("Supabase evaluations error:", evalError)
    return NextResponse.json({ error: "فشل في جلب التقييمات: " + evalError.message }, { status: 500 })
  }

  // لكل الطلاب، ابحث عن سجل حضور في التاريخ المطلوب، وأضف التقييمات إن وجدت
  const records = students.map((student) => {
    const sameDayRecords = (attendance || []).filter((r) => r.student_id === student.id && r.date === selectedDate)
    const rec = sameDayRecords.find((r) => !r.is_compensation) || sameDayRecords[0]
    const compensationRecords = sameDayRecords.filter((r) => r.is_compensation)
    let evalRec = null;
    if (rec) {
      evalRec = (evaluations || []).find((e) => e.attendance_record_id === rec.id)
    }
    if (rec) {
      const notes = [
        rec.notes ?? null,
        compensationRecords.length > 0 ? `نجح بتعويض${compensationRecords.length > 1 ? ` (${compensationRecords.length})` : ""}` : null,
      ].filter(Boolean).join(" | ") || null

      return {
        id: rec.id,
        student_id: student.id,
        student_name: student.name,
        account_number: student.account_number,
        halaqah: student.halaqah,
        attendance_date: rec.date,
        status: rec.status,
        created_at: rec.created_at,
        notes,
        is_compensation: !!rec.is_compensation || compensationRecords.length > 0,
        hafiz_level: evalRec?.hafiz_level ?? null,
        tikrar_level: evalRec?.tikrar_level ?? null,
        samaa_level: evalRec?.samaa_level ?? null,
        rabet_level: evalRec?.rabet_level ?? null,
        hafiz_from_surah: evalRec?.hafiz_from_surah ?? null,
        hafiz_from_verse: evalRec?.hafiz_from_verse ?? null,
        hafiz_to_surah: evalRec?.hafiz_to_surah ?? null,
        hafiz_to_verse: evalRec?.hafiz_to_verse ?? null,
        samaa_from_surah: evalRec?.samaa_from_surah ?? null,
        samaa_from_verse: evalRec?.samaa_from_verse ?? null,
        samaa_to_surah: evalRec?.samaa_to_surah ?? null,
        samaa_to_verse: evalRec?.samaa_to_verse ?? null,
        rabet_from_surah: evalRec?.rabet_from_surah ?? null,
        rabet_from_verse: evalRec?.rabet_from_verse ?? null,
        rabet_to_surah: evalRec?.rabet_to_surah ?? null,
        rabet_to_verse: evalRec?.rabet_to_verse ?? null,
      }
    } else {
      return {
        id: `no-record-${student.id}-${selectedDate}`,
        student_id: student.id,
        student_name: student.name,
        account_number: student.account_number,
        halaqah: student.halaqah,
        attendance_date: selectedDate,
        status: null,
        created_at: null,
        notes: null,
        is_compensation: false,
        hafiz_level: null,
        tikrar_level: null,
        samaa_level: null,
        rabet_level: null,
        hafiz_from_surah: null,
        hafiz_from_verse: null,
        hafiz_to_surah: null,
        hafiz_to_verse: null,
        samaa_from_surah: null,
        samaa_from_verse: null,
        samaa_to_surah: null,
        samaa_to_verse: null,
        rabet_from_surah: null,
        rabet_from_verse: null,
        rabet_to_surah: null,
        rabet_to_verse: null,
      }
    }
  })

  return NextResponse.json({ records })
}
