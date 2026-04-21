import { NextResponse } from "next/server"
import { getSupabaseServer } from "@/lib/supabase-server"
import { requireRoles } from "@/lib/auth/guards"

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "لم يتم العثور على ملف" }, { status: 400 });
    }
    // قراءة محتوى الملف
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    // اسم فريد للملف
    const timestamp = Date.now();
    const originalName = file.name.replace(/\s+/g, "-");
    const fileName = `${timestamp}-${originalName}`;
    // رفع إلى supabase storage
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.storage.from("guess-images").upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ error: "فشل رفع الصورة إلى التخزين" }, { status: 500 });
    }
    // جلب رابط الصورة
    const { data: publicUrlData } = supabase.storage.from("guess-images").getPublicUrl(fileName);
    const imageUrl = publicUrlData?.publicUrl || null;
    return NextResponse.json({ url: imageUrl });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json({ error: "فشل رفع الصورة" }, { status: 500 });
  }
}
