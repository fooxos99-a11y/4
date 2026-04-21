import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { ensureStudentAccess, requireRoles } from "@/lib/auth/guards";

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["student", "admin", "supervisor"]);
    if ("response" in auth) {
      return auth.response;
    }

    const { session } = auth;
    const supabase = createAdminClient();
    const body = await request.json();
    const { student_id, level_number, correct_count, total_count } = body;

    if (!student_id || !level_number) {
      return NextResponse.json({ error: "student_id و level_number مطلوبان" }, { status: 400 });
    }

    const studentAccess = await ensureStudentAccess(supabase, session, student_id);
    if ("response" in studentAccess) {
      return studentAccess.response;
    }

    // تحقق إذا كان السجل موجود مسبقاً
    const { data: existing, error: fetchError } = await supabase
      .from("pathway_level_completions")
      .select("id")
      .eq("student_id", student_id)
      .eq("level_number", level_number)
      .maybeSingle();

    if (existing && existing.id) {
      return NextResponse.json({ success: true, alreadyCompleted: true });
    }

    // fetch student halaqah
    const { data: studentRow } = await supabase.from('students').select('halaqah').eq('id', student_id).single();
    const halaqah = studentRow?.halaqah;

    // جلب حالة خصم النصف من pathway_levels
    let levelQuery = supabase
      .from("pathway_levels")
      .select("id, points, half_points_applied")
      .eq("level_number", level_number);
    if (halaqah) {
      levelQuery = levelQuery.eq("halaqah", halaqah);
    }
    const { data: levelData, error: levelError } = await levelQuery.maybeSingle();

    if (levelError || !levelData) {
      return NextResponse.json({ error: "تعذر جلب بيانات المستوى" }, { status: 500 });
    }

    // تحديد النقاط الكاملة
    let fullPoints = 100;
    if (typeof levelData.points === 'number') fullPoints = levelData.points;
    if (levelData.half_points_applied) fullPoints = Math.floor(fullPoints / 2);

    // توزيع النقاط حسب عدد الإجابات الصحيحة
    let points = 0;
    if (typeof correct_count === 'number' && typeof total_count === 'number' && total_count > 0) {
      points = Math.floor((correct_count / total_count) * fullPoints);
    } else if (typeof correct_count === 'number' && typeof total_count === 'undefined') {
      // fallback: إذا لم يرسل total_count
      points = correct_count === 0 ? 0 : fullPoints;
    } else {
      points = 0;
    }

    // أضف السجل مع النقاط
    console.log("[COMPLETE-LEVEL API] Trying to insert:", { student_id, level_number, points, correct_count, total_count });
    const { data, error } = await supabase
      .from("pathway_level_completions")
      .insert({ student_id, level_number, points })
      .select()
      .single();

    if (error) {
      console.error("[COMPLETE-LEVEL API] Insert error:", error);
      return NextResponse.json({ error: error.message || "فشل في إضافة سجل الإكمال" }, { status: 500 });
    }

    if (points > 0) {
      const { data: currentStudent } = await supabase
        .from("students")
        .select("points, store_points")
        .eq("id", student_id)
        .maybeSingle();

      await supabase
        .from("students")
        .update({
          points: (currentStudent?.points || 0) + points,
          store_points: (currentStudent?.store_points || 0) + points,
        })
        .eq("id", student_id);
    }

    return NextResponse.json({ success: true, completion: data, points });
  } catch (error) {
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
