import { requireRoles } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"

// جدول الرسائل الجاهزة: whatsapp_ready_messages
// الحقل: text

export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("whatsapp_ready_messages")
      .select("*")
      .order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json({ messages: data || [] })
  } catch (error) {
    return NextResponse.json({ error: "فشل في جلب الرسائل الجاهزة" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }
    const supabase = createAdminClient()
    const { text } = await request.json()
    const { data, error } = await supabase
      .from("whatsapp_ready_messages")
      .insert([{ text }])
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ message: data })
  } catch (error) {
    return NextResponse.json({ error: "فشل في إضافة الرسالة الجاهزة" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }
    const supabase = createAdminClient()
    const { id } = await request.json()
    const { error } = await supabase
      .from("whatsapp_ready_messages")
      .delete()
      .eq("id", id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "فشل في حذف الرسالة الجاهزة" }, { status: 500 })
  }
}
