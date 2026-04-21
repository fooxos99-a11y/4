-- حذف جميع الأسئلة القديمة
DELETE FROM category_questions;

-- إضافة أسئلة للقرآن الكريم
INSERT INTO category_questions (category_id, question, answer, points)
SELECT id, 'كم عدد سور القرآن الكريم؟', '114 سورة', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT id, 'ما أطول سورة في القرآن؟', 'سورة البقرة', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT id, 'كم عدد أجزاء القرآن الكريم؟', '30 جزء', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT id, 'ما أقصر سورة في القرآن؟', 'سورة الكوثر', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT id, 'ما السورة التي تسمى قلب القرآن؟', 'سورة يس', 600
FROM categories WHERE name = 'القرآن الكريم';

-- إضافة أسئلة للسيرة النبوية
INSERT INTO category_questions (category_id, question, answer, points)
SELECT id, 'في أي عام ولد الرسول صلى الله عليه وسلم؟', 'عام الفيل', 200
FROM categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT id, 'كم كان عمر الرسول عند البعثة؟', '40 سنة', 200
FROM categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT id, 'ما اسم زوجة الرسول الأولى؟', 'خديجة بنت خويلد', 400
FROM categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT id, 'في أي غزوة استشهد حمزة بن عبد المطلب؟', 'غزوة أحد', 400
FROM categories WHERE name = 'السيرة النبوية'
UNION ALL
SELECT id, 'كم عدد غزوات الرسول صلى الله عليه وسلم؟', '27 غزوة', 600
FROM categories WHERE name = 'السيرة النبوية';

-- إضافة أسئلة للصحابة
INSERT INTO category_questions (category_id, question, answer, points)
SELECT id, 'من هو أول خليفة للمسلمين؟', 'أبو بكر الصديق', 200
FROM categories WHERE name = 'الصحابة'
UNION ALL
SELECT id, 'من هو الصحابي الملقب بالفاروق؟', 'عمر بن الخطاب', 200
FROM categories WHERE name = 'الصحابة'
UNION ALL
SELECT id, 'من هو حبر الأمة؟', 'عبد الله بن عباس', 400
FROM categories WHERE name = 'الصحابة'
UNION ALL
SELECT id, 'من هو سيف الله المسلول؟', 'خالد بن الوليد', 400
FROM categories WHERE name = 'الصحابة'
UNION ALL
SELECT id, 'من هو أمين هذه الأمة؟', 'أبو عبيدة بن الجراح', 600
FROM categories WHERE name = 'الصحابة';

-- إضافة أسئلة للفقه
INSERT INTO category_questions (category_id, question, answer, points)
SELECT id, 'كم عدد الصلوات المفروضة في اليوم؟', '5 صلوات', 200
FROM categories WHERE name = 'الفقه'
UNION ALL
SELECT id, 'ما هي أركان الإسلام؟', 'الشهادتان، الصلاة، الزكاة، الصوم، الحج', 200
FROM categories WHERE name = 'الفقه'
UNION ALL
SELECT id, 'كم عدد ركعات صلاة الظهر؟', '4 ركعات', 400
FROM categories WHERE name = 'الفقه'
UNION ALL
SELECT id, 'ما هو نصاب الزكاة في الذهب؟', '85 جرام', 400
FROM categories WHERE name = 'الفقه'
UNION ALL
SELECT id, 'ما هي أركان الحج؟', 'الإحرام، الوقوف بعرفة، طواف الإفاضة، السعي', 600
FROM categories WHERE name = 'الفقه';

-- إضافة أسئلة للعقيدة
INSERT INTO category_questions (category_id, question, answer, points)
SELECT id, 'كم عدد أركان الإيمان؟', '6 أركان', 200
FROM categories WHERE name = 'العقيدة'
UNION ALL
SELECT id, 'ما هي أركان الإيمان؟', 'الإيمان بالله، الملائكة، الكتب، الرسل، اليوم الآخر، القدر', 200
FROM categories WHERE name = 'العقيدة'
UNION ALL
SELECT id, 'كم عدد الملائكة المذكورين في القرآن بالاسم؟', 'جبريل وميكائيل', 400
FROM categories WHERE name = 'العقيدة'
UNION ALL
SELECT id, 'ما اسم الملك الموكل بالنفخ في الصور؟', 'إسرافيل', 400
FROM categories WHERE name = 'العقيدة'
UNION ALL
SELECT id, 'ما هي أول علامات الساعة الكبرى؟', 'طلوع الشمس من مغربها', 600
FROM categories WHERE name = 'العقيدة';

-- إضافة أسئلة للتاريخ الإسلامي
INSERT INTO category_questions (category_id, question, answer, points)
SELECT id, 'في أي عام هجري كانت غزوة بدر؟', 'السنة الثانية للهجرة', 200
FROM categories WHERE name = 'التاريخ الإسلامي'
UNION ALL
SELECT id, 'متى فتح المسلمون مكة؟', 'السنة الثامنة للهجرة', 200
FROM categories WHERE name = 'التاريخ الإسلامي'
UNION ALL
SELECT id, 'من فتح بلاد الشام؟', 'أبو عبيدة بن الجراح', 400
FROM categories WHERE name = 'التاريخ الإسلامي'
UNION ALL
SELECT id, 'متى كانت معركة اليرموك؟', '15 هجرية', 400
FROM categories WHERE name = 'التاريخ الإسلامي'
UNION ALL
SELECT id, 'متى سقطت الدولة العباسية؟', '656 هجرية', 600
FROM categories WHERE name = 'التاريخ الإسلامي';

-- إضافة أسئلة للأخلاق
INSERT INTO category_questions (category_id, question, answer, points)
SELECT id, 'ما أفضل الأخلاق في الإسلام؟', 'الصدق', 200
FROM categories WHERE name = 'الأخلاق'
UNION ALL
SELECT id, 'ما معنى البر؟', 'حسن الخلق وسعة الصدر', 200
FROM categories WHERE name = 'الأخلاق'
UNION ALL
SELECT id, 'ما هي أحب الأعمال إلى الله؟', 'بر الوالدين', 400
FROM categories WHERE name = 'الأخلاق'
UNION ALL
SELECT id, 'ما هو أعظم الذنوب بعد الشرك؟', 'عقوق الوالدين', 400
FROM categories WHERE name = 'الأخلاق'
UNION ALL
SELECT id, 'ما هي أفضل أخلاق الرسول؟', 'التواضع والصبر', 600
FROM categories WHERE name = 'الأخلاق';

-- إضافة أسئلة للعبادات
INSERT INTO category_questions (category_id, question, answer, points)
SELECT id, 'ما هي أفضل العبادات؟', 'الصلاة', 200
FROM categories WHERE name = 'العبادات'
UNION ALL
SELECT id, 'ما هي أفضل الأعمال بعد الفرائض؟', 'النوافل', 200
FROM categories WHERE name = 'العبادات'
UNION ALL
SELECT id, 'كم عدد ركعات صلاة التراويح؟', '20 ركعة', 400
FROM categories WHERE name = 'العبادات'
UNION ALL
SELECT id, 'ما هي أفضل الصدقات؟', 'سقي الماء', 400
FROM categories WHERE name = 'العبادات'
UNION ALL
SELECT id, 'ما هي أفضل أيام السنة؟', 'عشر ذي الحجة', 600
FROM categories WHERE name = 'العبادات';
