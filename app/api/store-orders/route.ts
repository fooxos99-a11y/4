export async function DELETE(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const body = await request.json();
    const { order_id, delete_all, ids } = body;
    if (Array.isArray(ids) && ids.length > 0) {
      // حذف مجموعة محددة من الطلبات
      const { error } = await supabase
        .from("store_orders")
        .delete()
        .in("id", ids);
      if (error) {
        return NextResponse.json({ error: "فشل في حذف الطلبات المحددة" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }
    if (delete_all) {
      // حذف جميع الطلبات
      const { error } = await supabase
        .from("store_orders")
        .delete();
      if (error) {
        return NextResponse.json({ error: "فشل في حذف جميع الطلبات" }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }
    if (!order_id) {
      return NextResponse.json({ error: "رقم الطلب مفقود" }, { status: 400 });
    }
    const { error } = await supabase
      .from("store_orders")
      .delete()
      .eq("id", order_id);
    if (error) {
      return NextResponse.json({ error: "فشل في حذف الطلب" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    console.log("[store-orders] API called");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const body = await request.json();
    const { student_id, student_name, product_id, product_name, price } = body;
    console.log("[store-orders] Body:", body);

    if (!student_id || !product_id || !product_name || !student_name || price === undefined) {
      console.log("[store-orders] Missing fields");
      return NextResponse.json({ error: "البيانات المطلوبة ناقصة" }, { status: 400 });
    }

    // Check if student has enough store_points
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("store_points")
      .eq("id", student_id)
      .single();
    console.log("[store-orders] Student:", student, studentError);

    if (studentError || !student) {
      console.log("[store-orders] Student not found");
      return NextResponse.json({ error: "لم يتم العثور على الطالب" }, { status: 404 });
    }

    if ((student.store_points ?? 0) < price) {
      console.log("[store-orders] Not enough store_points");
      return NextResponse.json({ error: "نقاط المتجر غير كافية" }, { status: 400 });
    }


    // Deduct store_points only
    const newStorePoints = (student.store_points ?? 0) - price;
    const { error: updateError } = await supabase
      .from("students")
      .update({ store_points: newStorePoints })
      .eq("id", student_id);
    console.log("[store-orders] Update store_points error:", updateError);
    if (updateError) {
      return NextResponse.json({ error: "فشل في تحديث نقاط المتجر" }, { status: 500 });
    }

    // Insert order
    const { error: orderError } = await supabase.from("store_orders").insert({
      student_id,
      student_name,
      product_id,
      product_name,
    });
    console.log("[store-orders] Insert order error:", orderError);
    if (orderError) {
      return NextResponse.json({ error: "فشل في تسجيل الطلب" }, { status: 500 });
    }

    if (body.theme_key) {
      // إذا كان المنتج مظهرًا، قم بتسجيله في جدول المشتريات (purchases) ليكون متاحًا في الملف الشخصي
      // نتجاهل الخطأ هنا في حال كان مسجلاً مسبقًا
      await supabase.from("purchases").insert({
        student_id,
        product_id: `theme_${body.theme_key}`,
        price
      });
    }

    console.log("[store-orders] Success");
    return NextResponse.json({ success: true, remaining_store_points: newStorePoints });
  } catch (error) {
    console.log("[store-orders] Unexpected error:", error);
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
