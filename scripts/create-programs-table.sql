-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  duration TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample data
INSERT INTO programs (name, date, duration, points, description, is_active)
VALUES 
  ('برنامج الأذكار', '15 يناير 2025', '4 أسابيع', 100, 'برنامج لحفظ وتطبيق الأذكار اليومية مع مراجعة يومية وتسميع أسبوعي', true),
  ('برنامج المعاني', '22 يناير 2025', '6 أسابيع', 150, 'برنامج لفهم معاني القرآن الكريم وتفسير الآيات بطريقة مبسطة', false),
  ('برنامج الإتقان', '5 فبراير 2025', '8 أسابيع', 200, 'برنامج لإتقان التلاوة والتجويد مع تطبيق عملي لأحكام التجويد', false),
  ('برنامج التدبر', '12 فبراير 2025', '5 أسابيع', 120, 'برنامج للتدبر في آيات القرآن واستخراج الفوائد والعبر', false),
  ('برنامج الحفظ المتقن', '20 فبراير 2025', '12 أسبوع', 180, 'برنامج لحفظ القرآن بإتقان مع مراجعة مستمرة وتثبيت الحفظ', false),
  ('برنامج المراجعة', '28 فبراير 2025', '3 أسابيع', 90, 'برنامج لمراجعة ما تم حفظه وتثبيته بطريقة منظمة', false);
