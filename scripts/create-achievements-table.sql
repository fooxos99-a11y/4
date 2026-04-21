-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'مكتمل',
  level TEXT DEFAULT 'ممتاز',
  icon_type TEXT DEFAULT 'trophy',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample data
INSERT INTO achievements (student_name, title, category, date, description, status, level, icon_type)
VALUES 
  ('محمد علي القحطاني', 'إنهاء حفظ 10 أجزاء', 'حفظ القرآن', '15 محرم 1446هـ', 'تمكن الطالب محمد من إنهاء حفظ 10 أجزاء من القرآن الكريم بإتقان وتميز، وهو إنجاز رائع يستحق التقدير والاحتفاء', 'مكتمل', 'متميز', 'trophy'),
  ('أحمد بن سعيد', 'إتمام برنامج الأذكار', 'الأذكار اليومية', '22 محرم 1446هـ', 'أكمل الطالب أحمد برنامج الأذكار اليومية بنجاح مع التزام كامل بالمراجعة والتطبيق العملي لمدة 4 أسابيع متواصلة', 'مكتمل', 'ممتاز', 'award'),
  ('عبدالله الحربي', 'إتقان التجويد', 'التجويد', '5 صفر 1446هـ', 'حصل الطالب عبدالله على تقييم ممتاز في إتقان أحكام التجويد وتطبيقها بشكل صحيح في التلاوة', 'مكتمل', 'متميز', 'medal');
