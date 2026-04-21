import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function PATCH(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { order_id } = body;
    if (!order_id) {
      return NextResponse.json({ error: "رقم الطلب مفقود" }, { status: 400 });
    }
    const { error } = await supabase
      .from("store_orders")
      .update({ is_delivered: true })
      .eq("id", order_id);
    if (error) {
      return NextResponse.json({ error: "فشل في تحديث حالة التسليم" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "خطأ غير متوقع" }, { status: 500 });
  }
}
