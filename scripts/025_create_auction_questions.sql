-- حذف الجداول القديمة إن وجدت
DROP TABLE IF EXISTS auction_questions CASCADE;
DROP TABLE IF EXISTS auction_categories CASCADE;

-- إنشاء جدول فئات المزاد
CREATE TABLE auction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول أسئلة المزاد
CREATE TABLE auction_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES auction_categories(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تمكين RLS
ALTER TABLE auction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_questions ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت
DROP POLICY IF EXISTS "Anyone can read auction categories" ON auction_categories;
DROP POLICY IF EXISTS "Anyone can read auction questions" ON auction_questions;
DROP POLICY IF EXISTS "Teachers and admins can insert auction categories" ON auction_categories;
DROP POLICY IF EXISTS "Teachers and admins can update auction categories" ON auction_categories;
DROP POLICY IF EXISTS "Teachers and admins can delete auction categories" ON auction_categories;
DROP POLICY IF EXISTS "Teachers and admins can insert auction questions" ON auction_questions;
DROP POLICY IF EXISTS "Teachers and admins can update auction questions" ON auction_questions;
DROP POLICY IF EXISTS "Teachers and admins can delete auction questions" ON auction_questions;

-- سياسات القراءة للجميع
CREATE POLICY "Anyone can read auction categories"
  ON auction_categories FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read auction questions"
  ON auction_questions FOR SELECT
  USING (true);

-- سياسات الكتابة للمعلمين والإداريين فقط
CREATE POLICY "Teachers and admins can insert auction categories"
  ON auction_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers and admins can update auction categories"
  ON auction_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers and admins can delete auction categories"
  ON auction_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers and admins can insert auction questions"
  ON auction_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers and admins can update auction questions"
  ON auction_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY "Teachers and admins can delete auction questions"
  ON auction_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('teacher', 'admin')
    )
  );

-- إضافة فئات افتراضية
INSERT INTO auction_categories (name) VALUES
  ('القرآن الكريم'),
  ('السيرة النبوية'),
  ('الصحابة'),
  ('الفقه'),
  ('العقيدة'),
  ('التاريخ الإسلامي')
ON CONFLICT DO NOTHING;

-- إضافة أسئلة للقرآن الكريم
INSERT INTO auction_questions (category_id, question, answer)
SELECT auction_categories.id, 'ما هي أول سورة نزلت في القرآن الكريم؟', 'سورة العلق'
FROM auction_categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT auction_categories.id, 'ما هي أطول آية في القرآن الكريم؟', 'آية الدين في سورة البقرة'
FROM auction_categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT auction_categories.id, 'كم عدد سور القرآن الكريم؟', '114 سورة'
FROM auction_categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT auction_categories.id, 'كم عدد أجزاء القرآن الكريم؟', '30 جزء'
FROM auction_categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT auction_categories.id, 'ما هي الليلة التي نزل فيها القرآن؟', 'ليلة القدر'
FROM auction_categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT auction_categories.id, 'ما اسم السورة التي تسمى قلب القرآن؟', 'سورة يس'
FROM auction_categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT auction_categories.id, 'ما هي أقصر سورة في القرآن؟', 'سورة الكوثر'
FROM auction_categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT auction_categories.id, 'ما هي السورة التي ذُكرت فيها البسملة مرتين؟', 'سورة النمل'
FROM auction_categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT auction_categories.id, 'ما هي السورة التي تعدل ثلث القرآن؟', 'سورة الإخلاص'
FROM auction_categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT auction_categories.id, 'كم عدد السجدات في القرآن الكريم؟', '15 سجدة'
FROM auction_categories WHERE name = 'القرآن الكريم';

-- إضافة أسئلة للسيرة النبوية
INSERT INTO auction_questions (category_id, question, answer)
SELECT auction_categories.id, 'من هو خاتم الأنبياء والمرسلين؟', 'محمد صلى الله عليه وسلم'
FROM auction_categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT auction_categories.id, 'ما اسم الغار الذي اختبأ فيه النبي أثناء الهجرة؟', 'غار ثور'
FROM auction_categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT auction_categories.id, 'ما اسم ناقة النبي صلى الله عليه وسلم؟', 'القصواء'
FROM auction_categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT auction_categories.id, 'ما اسم زوجة النبي الأولى؟', 'خديجة بنت خويلد'
FROM auction_categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT auction_categories.id, 'كم عدد أولاد النبي صلى الله عليه وسلم؟', '7 أولاد'
FROM auction_categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT auction_categories.id, 'ما اسم أم النبي صلى الله عليه وسلم؟', 'آمنة بنت وهب'
FROM auction_categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT auction_categories.id, 'كم كان عمر النبي عند نزول الوحي؟', '40 سنة'
FROM auction_categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT auction_categories.id, 'كم استمرت الدعوة السرية في مكة؟', '3 سنوات'
FROM auction_categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT auction_categories.id, 'ما اسم جبل الوحي؟', 'جبل حراء'
FROM auction_categories WHERE name = 'السيرة النبوية';

-- إضافة أسئلة للصحابة
INSERT INTO auction_questions (category_id, question, answer)
SELECT auction_categories.id, 'من هو الصحابي الملقب بأسد الله؟', 'حمزة بن عبد المطلب'
FROM auction_categories WHERE name = 'الصحابة'
UNION ALL
SELECT auction_categories.id, 'من هو أول خليفة للمسلمين؟', 'أبو بكر الصديق'
FROM auction_categories WHERE name = 'الصحابة'
UNION ALL
SELECT auction_categories.id, 'من هو الصحابي الذي لُقب بالفاروق؟', 'عمر بن الخطاب'
FROM auction_categories WHERE name = 'الصحابة'
UNION ALL
SELECT auction_categories.id, 'من هو حبر الأمة؟', 'عبد الله بن عباس'
FROM auction_categories WHERE name = 'الصحابة'
UNION ALL
SELECT auction_categories.id, 'من هو الصحابي الذي أذن في أول جمعة؟', 'بلال بن رباح'
FROM auction_categories WHERE name = 'الصحابة'
UNION ALL
SELECT auction_categories.id, 'من هو الصحابي الملقب بذي النورين؟', 'عثمان بن عفان'
FROM auction_categories WHERE name = 'الصحابة'
UNION ALL
SELECT auction_categories.id, 'ما اسم عم النبي الذي آمن به؟', 'حمزة بن عبد المطلب'
FROM auction_categories WHERE name = 'الصحابة'
UNION ALL
SELECT auction_categories.id, 'من هو الصحابي الذي تستحي منه الملائكة؟', 'عثمان بن عفان'
FROM auction_categories WHERE name = 'الصحابة'
UNION ALL
SELECT auction_categories.id, 'من هو حواري النبي صلى الله عليه وسلم؟', 'الزبير بن العوام'
FROM auction_categories WHERE name = 'الصحابة'
UNION ALL
SELECT auction_categories.id, 'من هو أمين هذه الأمة؟', 'أبو عبيدة بن الجراح'
FROM auction_categories WHERE name = 'الصحابة';

-- إضافة أسئلة للفقه
INSERT INTO auction_questions (category_id, question, answer)
SELECT auction_categories.id, 'كم عدد الصلوات المفروضة في اليوم؟', '5 صلوات'
FROM auction_categories WHERE name = 'الفقه'
UNION ALL
SELECT auction_categories.id, 'في أي شهر فرض الصيام؟', 'شهر رمضان'
FROM auction_categories WHERE name = 'الفقه'
UNION ALL
SELECT auction_categories.id, 'كم عدد أركان الإسلام؟', '5 أركان'
FROM auction_categories WHERE name = 'الفقه'
UNION ALL
SELECT auction_categories.id, 'ما هي أركان الإسلام؟', 'الشهادتان، الصلاة، الزكاة، الصوم، الحج'
FROM auction_categories WHERE name = 'الفقه'
UNION ALL
SELECT auction_categories.id, 'كم عدد ركعات صلاة الظهر؟', '4 ركعات'
FROM auction_categories WHERE name = 'الفقه';

-- إضافة أسئلة للعقيدة
INSERT INTO auction_questions (category_id, question, answer)
SELECT auction_categories.id, 'ما هو الكتاب المقدس للمسلمين؟', 'القرآن الكريم'
FROM auction_categories WHERE name = 'العقيدة'
UNION ALL
SELECT auction_categories.id, 'كم عدد أركان الإيمان؟', '6 أركان'
FROM auction_categories WHERE name = 'العقيدة'
UNION ALL
SELECT auction_categories.id, 'ما هي أركان الإيمان؟', 'الإيمان بالله، الملائكة، الكتب، الرسل، اليوم الآخر، القدر'
FROM auction_categories WHERE name = 'العقيدة';

-- إضافة أسئلة للتاريخ الإسلامي
INSERT INTO auction_questions (category_id, question, answer)
SELECT auction_categories.id, 'في أي عام حدثت الهجرة النبوية؟', 'عام 622 ميلادي'
FROM auction_categories WHERE name = 'التاريخ الإسلامي'
UNION ALL
SELECT auction_categories.id, 'ما هي أول معركة في الإسلام؟', 'غزوة بدر'
FROM auction_categories WHERE name = 'التاريخ الإسلامي'
UNION ALL
SELECT auction_categories.id, 'كم يوم صام النبي في غزوة بدر؟', 'لم يصم، كانت في رمضان ولكنه أفطر للقتال'
FROM auction_categories WHERE name = 'التاريخ الإسلامي'
UNION ALL
SELECT auction_categories.id, 'من هو أول مولود في الإسلام بعد الهجرة؟', 'عبد الله بن الزبير'
FROM auction_categories WHERE name = 'التاريخ الإسلامي'
UNION ALL
SELECT auction_categories.id, 'كم عدد غزوات النبي صلى الله عليه وسلم؟', '27 غزوة'
FROM auction_categories WHERE name = 'التاريخ الإسلامي'
UNION ALL
SELECT auction_categories.id, 'كم عدد المهاجرين في الهجرة الأولى للحبشة؟', '11 رجلاً و4 نساء'
FROM auction_categories WHERE name = 'التاريخ الإسلامي';
