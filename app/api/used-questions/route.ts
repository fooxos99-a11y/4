import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - جلب الأسئلة المستخدمة
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const gameType = searchParams.get('gameType')

    if (!gameType) {
      return NextResponse.json({ error: 'Game type is required' }, { status: 400 })
    }

    // الحصول على المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('used_questions')
      .select('question_id')
      .eq('user_id', user.id)
      .eq('game_type', gameType)

    if (error) throw error

    return NextResponse.json(data.map(item => item.question_id))
  } catch (error) {
    console.error('Error fetching used questions:', error)
    return NextResponse.json({ error: 'Failed to fetch used questions' }, { status: 500 })
  }
}

// POST - إضافة سؤال مستخدم
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { gameType, questionId } = body

    if (!gameType || !questionId) {
      return NextResponse.json({ error: 'Game type and question ID are required' }, { status: 400 })
    }

    // الحصول على المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('used_questions')
      .insert([{
        user_id: user.id,
        game_type: gameType,
        question_id: questionId
      }])
      .select()

    if (error) {
      // إذا كان السؤال موجود بالفعل، تجاهل الخطأ
      if (error.code === '23505') { // unique violation
        return NextResponse.json({ message: 'Already marked as used' })
      }
      throw error
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error('Error adding used question:', error)
    return NextResponse.json({ error: 'Failed to add used question' }, { status: 500 })
  }
}

// DELETE - حذف جميع الأسئلة المستخدمة (إعادة تعيين)
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const gameType = searchParams.get('gameType')

    if (!gameType) {
      return NextResponse.json({ error: 'Game type is required' }, { status: 400 })
    }

    // الحصول على المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('used_questions')
      .delete()
      .eq('user_id', user.id)
      .eq('game_type', gameType)

    if (error) throw error

    return NextResponse.json({ message: 'Used questions reset successfully' })
  } catch (error) {
    console.error('Error resetting used questions:', error)
    return NextResponse.json({ error: 'Failed to reset used questions' }, { status: 500 })
  }
}
