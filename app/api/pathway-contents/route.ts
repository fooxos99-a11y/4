// حذف محتوى تعليمي
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "رقم المحتوى مطلوب" }, { status: 400 });
    }
    const { error } = await supabase
      .from("pathway_contents")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "فشل في حذف المحتوى" }, { status: 500 });
  }
}
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// إضافة محتوى جديد للمسار
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { level_id, content_title, content_description, content_url, content_type, halaqah } = body;
    if (!level_id || !content_title || !content_type) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }
    let targetHalaqat = [halaqah]

    if (halaqah === "all") {
      const { data: circles, error: circlesError } = await supabase.from("circles").select("name").order("name")
      if (circlesError) throw circlesError
      targetHalaqat = (circles || []).map((circle) => circle.name).filter(Boolean)
    }

    if (targetHalaqat.length === 0) {
      return NextResponse.json({ error: "لا توجد حلقات متاحة لإضافة المحتوى" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("pathway_contents")
      .insert(targetHalaqat.map((halaqahName) => ({ level_id, content_title, content_description, content_url, content_type, halaqah: halaqahName })))
      .select()
    
    if (error) throw error;
    return NextResponse.json({ content: Array.isArray(data) ? data[0] : data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || JSON.stringify(error) || "فشل في إضافة المحتوى" }, { status: 500 });
  }
}

// جلب جميع المحتويات لمستوى معين
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const level_id = searchParams.get("level_id");
    const halaqah = searchParams.get("halaqah");
    
    if (!level_id) {
      return NextResponse.json({ error: "رقم المستوى مطلوب" }, { status: 400 });
    }
    
    let query = supabase.from("pathway_contents").select("*").eq("level_id", level_id);
    if (halaqah) {
        query = query.eq("halaqah", halaqah);
    }
    
    const { data, error } = await query.order("id");
    
    if (error) throw error;
    return NextResponse.json({ contents: data });
  } catch (error) {
    return NextResponse.json({ error: "فشل في جلب المحتوى" }, { status: 500 });
  }
}
