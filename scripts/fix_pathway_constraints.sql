-- أولاً: حذف القيود التي تعتمد على pathway_levels.level_number

-- حذف المفتاح الأجنبي (Foreign Key) من جدول pathway_level_questions الذي يعتمد على level_number
ALTER TABLE pathway_level_questions DROP CONSTRAINT IF EXISTS pathway_level_questions_level_number_fkey;

-- (اختياري، إن وجد) حذف أي مفتاح أجنبي من pathway_level_completions يعتمد على level_number
ALTER TABLE pathway_level_completions DROP CONSTRAINT IF EXISTS pathway_level_completions_level_number_fkey;

-- ثانياً: يمكنك الآن حذف قيد الفرادة (UNIQUE) من جدول pathway_levels بشكل آمن
ALTER TABLE pathway_levels DROP CONSTRAINT IF EXISTS pathway_levels_level_number_key;

-- ثالثاً: يجب أولاً إضافة عمود halaqah إلى الجداول التي ستحتاجه (إذا لم يكن موجوداً بالفعل)
ALTER TABLE pathway_levels ADD COLUMN IF NOT EXISTS halaqah text;
ALTER TABLE pathway_level_questions ADD COLUMN IF NOT EXISTS halaqah text;
ALTER TABLE pathway_contents ADD COLUMN IF NOT EXISTS halaqah text;
ALTER TABLE pathway_level_completions ADD COLUMN IF NOT EXISTS halaqah text;

-- رابعاً: الآن يمكننا إضافة القيد الجديد على جدول pathway_levels ليعتمد على رقم المستوى واسم الحلقة
ALTER TABLE pathway_levels ADD CONSTRAINT pathway_levels_level_number_halaqah_key UNIQUE (level_number, halaqah);

-- ملاحظة مهمة: 
-- الربط السابق كان يعتمد فقط على رقم المستوى، الآن أصبح يعتمد على رقم المستوى والحلقة.
-- بالتالي جداول الأسئلة (pathway_level_questions) وإكمال المستوى (pathway_level_completions)
-- يجب أن تحتوي على عمود halaqah لكي يتم بناء مفتاح أجنبي صحيح. 
-- إذا لم تكن هذه الجداول تحتوي على العمود حتى الآن، فمن الأفضل عدم إعادة تشكيل المفتاح الأجنبي الآن
-- والاعتماد على منطق التطبيق (Application Logic) لضمان اتساق البيانات حتى تقوم بتحديث باقي الجداول.