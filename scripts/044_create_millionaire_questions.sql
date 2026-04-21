CREATE TABLE IF NOT EXISTS millionaire_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  option_1 TEXT NOT NULL,
  option_2 TEXT NOT NULL,
  option_3 TEXT NOT NULL,
  option_4 TEXT NOT NULL,
  correct_option SMALLINT NOT NULL CHECK (correct_option BETWEEN 1 AND 4),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS millionaire_questions_difficulty_created_idx
  ON millionaire_questions (difficulty, created_at, id);

ALTER TABLE millionaire_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read millionaire questions" ON millionaire_questions;
DROP POLICY IF EXISTS "Authenticated can insert millionaire questions" ON millionaire_questions;
DROP POLICY IF EXISTS "Authenticated can update millionaire questions" ON millionaire_questions;
DROP POLICY IF EXISTS "Authenticated can delete millionaire questions" ON millionaire_questions;
DROP POLICY IF EXISTS "Anyone can read millionaire questions" ON millionaire_questions;
DROP POLICY IF EXISTS "Anyone can insert millionaire questions" ON millionaire_questions;
DROP POLICY IF EXISTS "Anyone can update millionaire questions" ON millionaire_questions;
DROP POLICY IF EXISTS "Anyone can delete millionaire questions" ON millionaire_questions;

CREATE POLICY "Anyone can read millionaire questions"
  ON millionaire_questions FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert millionaire questions"
  ON millionaire_questions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update millionaire questions"
  ON millionaire_questions FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete millionaire questions"
  ON millionaire_questions FOR DELETE
  USING (true);

INSERT INTO millionaire_questions (question, option_1, option_2, option_3, option_4, correct_option, difficulty)
SELECT
  seed.question,
  seed.option_1,
  seed.option_2,
  seed.option_3,
  seed.option_4,
  seed.correct_option,
  seed.difficulty
FROM (
  VALUES
    ('من هو الصحابي الملقب بـ "أمين هذه الأمة"؟', 'أبو بكر الصديق', 'عمر بن الخطاب', 'أبو عبيدة الجراح', 'علي بن أبي طالب', 3, 'easy'),
    ('ما هي السورة التي تُلقب بـ "بني إسرائيل"؟', 'سورة الكهف', 'سورة الإسراء', 'سورة مريم', 'سورة طه', 2, 'easy'),
    ('ما هي الغزوة التي لُقبت في القرآن الكريم بـ "يوم الفرقان"؟', 'غزوة بدر', 'غزوة أحد', 'غزوة الخندق', 'غزوة حنين', 1, 'easy'),
    ('من هو القائد المسلم الذي لُقب بـ "فاتح القسطنطينية"؟', 'هارون الرشيد', 'محمد الفاتح', 'سليمان القانوني', 'صلاح الدين الأيوبي', 2, 'easy'),
    ('ما هي أكبر دولة في أفريقيا من حيث المساحة؟', 'مصر', 'نيجيريا', 'الجزائر', 'السودان', 3, 'easy'),
    ('من هو الصحابي الذي اهتز لموته عرش الرحمن؟', 'حمزة بن عبد المطلب', 'سعد بن معاذ', 'جعفر بن أبي طالب', 'خالد بن الوليد', 2, 'easy'),
    ('في أي مدينة أندلسية يقع "قصر الحمراء" الشهير؟', 'قرطبة', 'إشبيلية', 'غرناطة', 'طليطلة', 3, 'easy'),
    ('ما هو أعمق خندق مائي في العالم؟', 'خندق ماريانا', 'خندق بورتوريكو', 'خندق جاوا', 'خندق تونغا', 1, 'easy'),
    ('ما هي السورة التي وردت فيها البسملة مرتين؟', 'سورة الفاتحة', 'سورة البقرة', 'سورة النمل', 'سورة التوبة', 3, 'easy'),
    ('من هو الملك الذي بنى "حدائق بابل المعلقة" إحدى عجائب الدنيا السبع القديمة؟', 'حمورابي', 'نبوخذ نصر الثاني', 'سرجون الأكادي', 'كورش الكبير', 2, 'medium'),
    ('أي مدينة تُلقب بـ "مدينة التلال السبعة"؟', 'باريس', 'لندن', 'روما', 'أثينا', 3, 'medium'),
    ('كم عدد فقرات العمود الفقري للإنسان؟', '30 فقرة', '33 فقرة', '28 فقرة', '35 فقرة', 2, 'medium'),
    ('من هو النبي الذي أُرسل إلى قوم ثمود؟', 'هود عليه السلام', 'صالح عليه السلام', 'شعيب عليه السلام', 'لوط عليه السلام', 2, 'medium'),
    ('من هو القائد الذي قاد المسلمين للنصر في معركة "عين جالوت" ضد المغول؟', 'صلاح الدين الأيوبي', 'سيف الدين قطز', 'الظاهر بيبرس', 'نور الدين زنكي', 2, 'medium'),
    ('ما هي أصغر قارة في العالم من حيث المساحة؟', 'أوروبا', 'أستراليا', 'القارة القطبية الجنوبية', 'أمريكا الجنوبية', 2, 'medium'),
    ('ما هو العنصر الكيميائي الذي يُرمز له بالرمز "K"؟', 'الكالسيوم', 'البوتاسيوم', 'الكربون', 'الكبريت', 2, 'medium'),
    ('ما هو الاسم الآخر لغزوة "الخندق"؟', 'غزوة تبوك', 'غزوة الأحزاب', 'غزوة بني قريظة', 'غزوة خيبر', 2, 'medium'),
    ('ما هو أكبر محيط في العالم من حيث المساحة؟', 'المحيط الأطلسي', 'المحيط الهندي', 'المحيط المتجمد الشمالي', 'المحيط الهادئ', 4, 'medium'),
    ('ما هي السورة التي تُسمى "قلب القرآن"؟', 'سورة البقرة', 'سورة الإخلاص', 'سورة يس', 'سورة الفاتحة', 3, 'medium'),
    ('من هو القائد الذي أسس الدولة الأموية؟', 'عبد الملك بن مروان', 'معاوية بن أبي سفيان', 'عمر بن عبد العزيز', 'مروان بن محمد', 2, 'hard'),
    ('في أي قارة تقع صحراء كالاهاري؟', 'آسيا', 'أمريكا الجنوبية', 'أفريقيا', 'أستراليا', 3, 'hard'),
    ('ما هو الرمز الكيميائي لعنصر الذهب؟', 'Ag', 'Fe', 'Au', 'Pb', 3, 'hard'),
    ('ما هي الدولة التي تُعرف بـ "أرض المليون خريطة" أو "بلد العشرة آلاف بحيرة"؟', 'النرويج', 'كندا', 'فنلندا', 'السويد', 2, 'hard'),
    ('كم كان عدد المسلمين في غزوة خيبر؟', '1000 مقاتل', '1400 مقاتل', '3000 مقاتل', '10,000 مقاتل', 2, 'hard'),
    ('من هو القائد الذي لُقب بـ "قاهر التتار" في معركة عين جالوت؟', 'الظاهر بيبرس', 'سيف الدين قطز', 'الناصر محمد بن قلاوون', 'شجر الدر', 2, 'hard'),
    ('من هي الصحابية الملقبة بـ "ذات النطاقين"؟', 'خديجة بنت خويلد', 'أسماء بنت أبي بكر', 'عائشة بنت أبي بكر', 'فاطمة الزهراء', 2, 'hard'),
    ('كم عدد أبواب الجنة التي يدخل منها المؤمنون؟', '5 أبواب', '7 أبواب', '8 أبواب', '10 أبواب', 3, 'hard'),
    ('كم عدد السور التي تبدأ بـ "حروف مقطعة" مثل الم، الر في القرآن الكريم؟', '25 سورة', '27 سورة', '29 سورة', '31 سورة', 3, 'hard'),
    ('من هو الصحابي الذي أمره النبي ﷺ بتعلم لغة اليهود السريانية والعبرية فتعلمها في 15 يوماً فقط؟', 'معاذ بن جبل', 'زيد بن ثابت', 'أبي بن كعب', 'عبد الله بن الزبير', 2, 'hard'),
    ('ما هي السورة التي تُسمى "سورة النعم" لكثرة ما ذكر الله فيها من نعم على عباده؟', 'سورة الرحمن', 'سورة النحل', 'سورة فاطر', 'سورة يس', 2, 'hard'),
    ('من هو الصحابي الذي نزل فيه قوله تعالى: "وَمِنَ النَّاسِ مَن يَشْرِي نَفْسَهُ ابْتِغَاءَ مَرْضَاتِ اللَّهِ" عند هجرته؟', 'أبو سلمة بن عبد الأسد', 'مصعب بن عمير', 'صهيب الرومي', 'بلال بن رباح', 3, 'hard')
) AS seed(question, option_1, option_2, option_3, option_4, correct_option, difficulty)
LEFT JOIN millionaire_questions existing
  ON existing.question = seed.question
WHERE existing.id IS NULL;