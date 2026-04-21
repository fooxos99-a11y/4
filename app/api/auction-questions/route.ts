import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('auction_questions')
      .select(`
        *,
        category:auction_categories(id, name)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching auction questions:', error)
    return NextResponse.json({ error: 'Failed to fetch auction questions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('auction_questions')
      .insert([{
        category_id: body.category_id,
        question: body.question,
        answer: body.answer
      }])
      .select(`
        *,
        category:auction_categories(id, name)
      `)

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error creating auction question:', error)
    return NextResponse.json({ error: 'Failed to create auction question' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('auction_questions')
      .update({
        category_id: body.category_id,
        question: body.question,
        answer: body.answer,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select(`
        *,
        category:auction_categories(id, name)
      `)

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error updating auction question:', error)
    return NextResponse.json({ error: 'Failed to update auction question' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const { error } = await supabase
      .from('auction_questions')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting auction question:', error)
    return NextResponse.json({ error: 'Failed to delete auction question' }, { status: 500 })
  }
}
