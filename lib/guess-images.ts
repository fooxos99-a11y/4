import { supabase } from '@/lib/supabase-client';

export async function getGuessImages() {
  // جدول الصور يجب أن يكون اسمه guess_images ويحتوي على الأعمدة: id, image_url, answer
  const { data, error } = await supabase
    .from('guess_images')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return data;
}
