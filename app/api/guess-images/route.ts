import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// GET - جلب جميع الصور
export async function GET(request: Request) {
  try {
    const supabase = await getSupabase()
    const { searchParams } = new URL(request.url)
    const stageId = searchParams.get("stage_id")
    let query = supabase.from("guess_images").select("*")
    if (stageId) {
      query = query.eq("stage_id", stageId)
    }
    const { data, error } = await query.order("created_at", { ascending: false })
    if (error) throw error
    return NextResponse.json(data || [])
  } catch (error) {
    console.error("Error fetching images:", error)
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 })
  }
}

// POST - إضافة صورة جديدة
export async function POST(request: Request) {
  try {
    const supabase = await getSupabase()

    const body = await request.json()
    const { image_url, answer, hint, difficulty, stage_id } = body

    if (!image_url || !answer || !stage_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from("guess_images")
      .insert([
        {
          image_url,
          answer,
          hint: hint || null,
          difficulty: difficulty || 'متوسط',
          active: true,
          stage_id
        }
      ])
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Error creating image:", error)
    return NextResponse.json({ error: "Failed to create image" }, { status: 500 })
  }
}

// PUT - تحديث صورة
export async function PUT(request: Request) {
  try {
    const supabase = await getSupabase()

    const body = await request.json()
    const { id, image_url, answer, hint, difficulty, active } = body

    if (!id) {
      return NextResponse.json(
        { error: "Missing image ID" },
        { status: 400 }
      )
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (image_url !== undefined) updateData.image_url = image_url
    if (answer !== undefined) updateData.answer = answer
    if (hint !== undefined) updateData.hint = hint
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (active !== undefined) updateData.active = active

    const { data, error } = await supabase
      .from("guess_images")
      .update(updateData)
      .eq("id", id)
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Error updating image:", error)
    return NextResponse.json({ error: "Failed to update image" }, { status: 500 })
  }
}

// DELETE - حذف صورة
export async function DELETE(request: Request) {
  try {
    const supabase = await getSupabase()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Missing image ID" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("guess_images")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting image:", error)
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 })
  }
}
