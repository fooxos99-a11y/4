import { supabase } from '@/lib/supabase-client';

// جلب جميع المراحل
export async function getGuessStages() {
  const { data, error } = await supabase
    .from('guess_image_stages')
    .select('*')
    .order('id', { ascending: true });
  if (error) throw error;
  return data;
}

// جلب الصور لمسرح معين
export async function getGuessImagesByStage(stageId: number) {
  const { data, error } = await supabase
    .from('guess_images')
    .select('*')
    .eq('stage_id', stageId)
    .order('id', { ascending: true });
  if (error) throw error;
  return data;
}
