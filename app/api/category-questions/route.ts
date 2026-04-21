import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { category_id, question, answer, points } = await request.json()

    const { data, error } = await supabase
      .from("category_questions")
      .insert([{ category_id, question, answer, points }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error creating question:", error)
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { id, question, answer, points } = await request.json()

    const { data, error } = await supabase
      .from("category_questions")
      .update({ question, answer, points, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error updating question:", error)
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from("category_questions")
      .delete()
      .eq("id", id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting question:", error)
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    )
  }
}
