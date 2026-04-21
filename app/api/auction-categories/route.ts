import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('auction_categories')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching auction categories:', error)
    return NextResponse.json({ error: 'Failed to fetch auction categories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('auction_categories')
      .insert([{
        name: body.name
      }])
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error creating auction category:', error)
    return NextResponse.json({ error: 'Failed to create auction category' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('auction_categories')
      .update({
        name: body.name,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()

    if (error) throw error

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error updating auction category:', error)
    return NextResponse.json({ error: 'Failed to update auction category' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const { error } = await supabase
      .from('auction_categories')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting auction category:', error)
    return NextResponse.json({ error: 'Failed to delete auction category' }, { status: 500 })
  }
}
