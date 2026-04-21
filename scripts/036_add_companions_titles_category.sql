-- إضافة فئة "ألقاب الصحابة" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('ألقاب الصحابة')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'من هو الصديق؟', 'أبو بكر بن أبي قحافة رضي الله عنه', 200
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو الفاروق؟', 'عمر بن الخطاب رضي الله عنه', 200
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو صاحب سر النبي صلى الله عليه وسلم؟', 'حذيفة بن اليمان رضي الله عنه', 200
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو ذو النورين؟', 'عثمان بن عفان رضي الله عنه', 200
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو شاعر النبي صلى الله عليه وسلم؟', 'حسان بن ثابت رضي الله عنه', 200
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو أسد الله؟', 'حمزة بن عبد المطلب رضي الله عنه', 200
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو سيف الله المسلول؟', 'خالد بن الوليد رضي الله عنه', 200
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو خادم الرسول صلى الله عليه وسلم؟', 'أنس بن مالك رضي الله عنه', 200
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو حبر هذه الأمة؟', 'عبد الله بن عباس رضي الله عنه', 200
FROM categories WHERE name = 'ألقاب الصحابة';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'من هو خطيب النبي صلى الله عليه وسلم؟', 'ثابت بن قيس رضي الله عنه', 400
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو حواري الرسول صلى الله عليه وسلم؟', 'الزبير بن العوام رضي الله عنه', 400
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو أمين هذه الأمة؟', 'أبو عبيدة بن الجراح رضي الله عنه', 400
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هما ريحانتا النبي صلى الله عليه وسلم؟', 'الحسن والحسين رضي الله عنهما', 400
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو سابق الروم إلى الإسلام؟', 'صهيب بن سنان الرومي رضي الله عنه', 400
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو سابق الفرس إلى الإسلام؟', 'سلمان الفارسي رضي الله عنه', 400
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو الشهيد الطيار؟', 'جعفر بن أبي طالب رضي الله عنه', 400
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو الملقب بسيد المسلمين؟', 'أبي بن كعب رضي الله عنه', 400
FROM categories WHERE name = 'ألقاب الصحابة';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'من هو حكيم هذه الأمة؟', 'أبو الدرداء عويمر بن زيد رضي الله عنه', 600
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو ذو الشمالين؟', 'عمير بن عبد عمرو بن نضلة رضي الله عنه', 600
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو أرطبون العرب؟', 'عمرو بن العاص رضي الله عنه', 600
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو إمام العلماء يوم القيامة؟', 'معاذ بن جبل رضي الله عنه', 600
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو حمامة المسجد؟', 'عبد الله بن الزبير رضي الله عنه', 600
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو الصحابي الملقب بأمير الأمراء؟', 'أبو عبيدة بن الجراح رضي الله عنه', 600
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو أبو المساكين؟', 'جعفر بن أبي طالب رضي الله عنه', 600
FROM categories WHERE name = 'ألقاب الصحابة'
UNION ALL
SELECT categories.id, 'من هو الملقب "بالمعنق ليموت"؟', 'المنذر بن عمرو الساعدي رضي الله عنه', 600
FROM categories WHERE name = 'ألقاب الصحابة';
