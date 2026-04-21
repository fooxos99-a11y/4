import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('guess_image_stages')
    .select('*')
    .order('id', { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// إضافة مرحلة جديدة
export async function POST(req: Request) {
  const supabase = getSupabase();
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: 'الاسم مطلوب' }, { status: 400 });
  const { data, error } = await supabase
    .from('guess_image_stages')
    .insert([{ name }])
    .select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data?.[0] ?? {});
}

// حذف مرحلة
export async function DELETE(req: Request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'المعرف مطلوب' }, { status: 400 });
  const { error } = await supabase
    .from('guess_image_stages')
    .delete()
    .eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
