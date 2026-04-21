import { createClient } from "@/lib/supabase/client";

// جلب سؤال جديد حسب نظام التقدم لكل حساب ولكل حرف
export async function getNextQuestionForAccount(accountNumber: number, letter: string) {
  const supabase = createClient();

  // 1. جلب جميع الأسئلة المرتبطة بالحرف (مرتبة)
  const { data: questions, error: qError } = await supabase
    .from("letter_hive_questions")
    .select("id,question,answer")
    .eq("letter", letter)
    .order("id", { ascending: true });
  if (qError || !questions || questions.length === 0) return null;

  // 2. جلب آخر مؤشر سؤال لهذا الحساب والحرف
  const { data: progressRows } = await supabase
    .from("letter_hive_progress")
    .select("last_question_index,id")
    .eq("account_number", accountNumber)
    .eq("letter", letter)
    .limit(1);

  let nextIndex = 0;
  let progressId = null;
  if (progressRows && progressRows.length > 0) {
    nextIndex = progressRows[0].last_question_index + 1;
    progressId = progressRows[0].id;
    if (nextIndex >= questions.length) nextIndex = 0;
  }

  // 3. تحديث أو إدراج المؤشر الجديد
  if (progressId) {
    const { error: updateError, data: updateData } = await supabase
      .from("letter_hive_progress")
      .update({ last_question_index: nextIndex, updated_at: new Date().toISOString() })
      .eq("id", progressId)
      .select();
    console.log("[progress update]", { progressId, nextIndex, updateError, updateData, updateErrorString: updateError ? JSON.stringify(updateError) : null });
  } else {
    const { error: insertError, data: insertData } = await supabase
      .from("letter_hive_progress")
      .insert({ account_number: accountNumber, letter, last_question_index: 0 })
      .select();
    console.log("[progress insert]", { accountNumber, letter, insertError, insertData, insertErrorString: insertError ? JSON.stringify(insertError) : null });
  }

  // 4. إعادة السؤال المطلوب
  // نضيف المؤشر الفعلي (debug)
  return { ...questions[nextIndex], _debugIndex: nextIndex };
}
