import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/auth/guards"

export const maxSize = 50 * 1024 * 1024; // 50MB

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = createAdminClient();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "لم يتم اختيار ملف" }, { status: 400 });
    }
    if (file.size > maxSize) {
      return NextResponse.json({ error: "الملف كبير جداً (الحد الأقصى 50MB)" }, { status: 400 });
    }
    const ext = file.name.split('.').pop();
    const fileName = `content_${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from("pathway-contents")
      .upload(fileName, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage
      .from("pathway-contents")
      .getPublicUrl(fileName);
    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    return NextResponse.json({ error: "فشل في رفع الملف" }, { status: 500 });
  }
}
