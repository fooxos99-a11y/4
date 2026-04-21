import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function PATCH(request: Request) {
  const body = await request.json();
  const { order_id, mark_all } = body;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  if (mark_all) {
    // تحديث جميع الطلبات غير المسلمة
    const { error } = await supabase
      .from("store_orders")
      .update({ is_delivered: true })
      .eq("is_delivered", false);
    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: error.message || "فشل في تحديث حالة التسليم للجميع", details: error.details },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  }
  if (!order_id) {
    return NextResponse.json({ error: "رقم الطلب مفقود" }, { status: 400 });
  }
  const { error, data } = await supabase
    .from("store_orders")
    .update({ is_delivered: true })
    .eq("id", order_id)
    .select();
  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json(
      { error: error.message || "فشل في تحديث حالة التسليم", details: error.details },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true, data });
}
