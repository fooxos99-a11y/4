import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"

export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("programs").select("*").order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching programs:", error)
      return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 })
    }

    return NextResponse.json({ programs: data || [] })
  } catch (error) {
    console.error("[v0] Error in GET /api/programs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, date, duration, points, description, is_active } = body

    const supabase = createClient()
    const { data, error } = await supabase
      .from("programs")
      .insert([
        {
          name,
          date,
          duration,
          points,
          description,
          is_active: is_active || false,
        },
      ])
      .select()

    if (error) {
      console.error("[v0] Error creating program:", error)
      return NextResponse.json({ error: "Failed to create program" }, { status: 500 })
    }

    return NextResponse.json({ success: true, program: data[0] })
  } catch (error) {
    console.error("[v0] Error in POST /api/programs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, date, duration, points, description, is_active } = body

    if (!id) {
      return NextResponse.json({ error: "Program ID is required" }, { status: 400 })
    }

    const supabase = createClient()
    const { data, error } = await supabase
      .from("programs")
      .update({
        name,
        date,
        duration,
        points,
        description,
        is_active,
      })
      .eq("id", id)
      .select()

    if (error) {
      console.error("[v0] Error updating program:", error)
      return NextResponse.json({ error: "Failed to update program" }, { status: 500 })
    }

    return NextResponse.json({ success: true, program: data[0] })
  } catch (error) {
    console.error("[v0] Error in PATCH /api/programs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Program ID is required" }, { status: 400 })
    }

    const supabase = createClient()
    const { error } = await supabase.from("programs").delete().eq("id", id)

    if (error) {
      console.error("[v0] Error deleting program:", error)
      return NextResponse.json({ error: "Failed to delete program" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in DELETE /api/programs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
