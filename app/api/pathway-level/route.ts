
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// إضافة محتوى جديد للمستوى (POST)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      levelId,
      content_type,
      content_title,
      content_description,
    } = body;

    if (!levelId || !content_title) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("pathway_contents")
      .insert([
        {
          level_id: levelId,
          content_type,
          content_title,
          content_description,
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}

// جلب محتوى وأسئلة المستوى (GET)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const levelId = searchParams.get("levelId");
  if (!levelId) {
    return NextResponse.json({ error: "Missing levelId" }, { status: 400 });
  }

  const supabase = await createClient();

  // جلب المحتوى
  const { data: contents, error: contentError } = await supabase
    .from("pathway_contents")
    .select("*")
    .eq("level_id", levelId)
    .order("id");

  // جلب الأسئلة
  const { data: quizzes, error: quizError } = await supabase
    .from("pathway_quizzes")
    .select("*")
    .eq("level_id", levelId)
    .order("id");

  if (contentError || quizError) {
    return NextResponse.json({ error: contentError?.message || quizError?.message }, { status: 500 });
  }

  return NextResponse.json({ contents, quizzes });
}
