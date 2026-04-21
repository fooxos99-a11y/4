import { createClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const

function isValidDifficulty(value: string): value is (typeof VALID_DIFFICULTIES)[number] {
  return VALID_DIFFICULTIES.includes(value as (typeof VALID_DIFFICULTIES)[number])
}

function normalizePayload(body: any) {
  const difficulty = String(body?.difficulty || '').trim()
  const correctOption = Number(body?.correct_option)

  if (!body?.question?.trim()) {
    return { error: 'Question is required' }
  }

  if (!body?.option_1?.trim() || !body?.option_2?.trim() || !body?.option_3?.trim() || !body?.option_4?.trim()) {
    return { error: 'All four options are required' }
  }

  if (!isValidDifficulty(difficulty)) {
    return { error: 'Difficulty must be easy, medium, or hard' }
  }

  if (!Number.isInteger(correctOption) || correctOption < 1 || correctOption > 4) {
    return { error: 'Correct option must be a number from 1 to 4' }
  }

  return {
    data: {
      question: body.question.trim(),
      option_1: body.option_1.trim(),
      option_2: body.option_2.trim(),
      option_3: body.option_3.trim(),
      option_4: body.option_4.trim(),
      correct_option: correctOption,
      difficulty,
    },
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const difficulty = searchParams.get('difficulty')

    let query = supabase
      .from('millionaire_questions')
      .select('*')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })

    if (difficulty) {
      if (!isValidDifficulty(difficulty)) {
        return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
      }

      query = query.eq('difficulty', difficulty)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching millionaire questions:', error)
    return NextResponse.json({ error: 'Failed to fetch millionaire questions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const normalized = normalizePayload(body)

    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('millionaire_questions')
      .insert([normalized.data])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating millionaire question:', error)
    return NextResponse.json({ error: 'Failed to create millionaire question' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    if (!body?.id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
    }

    const normalized = normalizePayload(body)

    if ('error' in normalized) {
      return NextResponse.json({ error: normalized.error }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('millionaire_questions')
      .update({
        ...normalized.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating millionaire question:', error)
    return NextResponse.json({ error: 'Failed to update millionaire question' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('millionaire_questions')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting millionaire question:', error)
    return NextResponse.json({ error: 'Failed to delete millionaire question' }, { status: 500 })
  }
}