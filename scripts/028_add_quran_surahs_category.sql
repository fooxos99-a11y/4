-- إضافة فئة "سور القرآن" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('سور القرآن')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'اسم من أسماء يوم القيامة ويعني الحدث الكبير المفزع؟', 'القارعة', 200
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'من مخلوقات الله لا نراها وتعيش معنا؟', 'الجن', 200
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'هو نهر في الجنة', 'الكوثر', 200
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'شيء يضيء السماء ليلاً، ويستخدم في الملاحة قديماً؟', 'النجم', 200
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'من أركان الإسلام، ويجمع الناس كل سنة بمكان واحد؟', 'الحج', 200
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'فاكهة ذُكرت في القرآن، وأقسم الله بها؟', 'التين', 200
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'أشخاص يُظهرون الإيمان ويُبطنون الكفر؟', 'المنافقون', 200
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'شيء يكتب على الورق؟', 'القلم', 200
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'شيء يُرمز للظلمة والسكون؟', 'الليل', 200
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'من أركان الصلاة؟', 'السجدة', 200
FROM categories WHERE name = 'سور القرآن';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'شيء إذا وقع في الأرض سبب دمارًا وخوفًا، ما هو؟', 'الزلزلة', 400
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'مكان يسكن فيه الإنسان ويحميه؟', 'البلد', 400
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'اسم لحيوان صغير يعيش في جماعات وله بيت محفور؟', 'النمل', 400
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'اسم يدل على الفرق أو المجموعات؟', 'الأحزاب', 400
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'اسم يدل على مجموعة تقف بترتيب؟', 'الصف', 400
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'هو اسم لعائلة؟', 'آل عمران', 400
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يُوضع عليه الطعام؟', 'المائدة', 400
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'بمعنى الغنائم أو المكاسب التي يحصل عليها المسلمون من الحرب أو غيرها؟', 'الأنفال', 400
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'هو حاجز بين الجنة والنار؟', 'الأعراف', 400
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'سورة سُميت باسم قبيلة تحدّت النبي وكذّبت بالدعوة؟', 'قريش', 400
FROM categories WHERE name = 'سور القرآن';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'سورة تتحدث عن نهاية العالم وتُصوّر مشهد انهيار الكون؟', 'التكوير', 600
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'شيء يرتبط بالزينة والجمال؟', 'الزخرف', 600
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'شيء صلب يُستخدم في البناء والصناعة؟', 'الحديد', 600
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'شيء يدل على بداية اليوم؟', 'الفجر', 600
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'اسم من أسماء الملائكة؟', 'المرسلات', 600
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'اسم مرتبط بالنقاش الحاد أو الحوار المتقلب؟', 'المجادلة', 600
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'كان قوم صالح يسكنونه؟', 'الحجر', 600
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'أحد حكماء العرب ومُعمّريهم ضُرب به المثل في الحكمة؟', 'لقمان', 600
FROM categories WHERE name = 'سور القرآن'
UNION ALL
SELECT categories.id, 'سورة سُميت باسم ما يستخدمه الناس عند الفرار والخوف والاختباء؟', 'الكهف', 600
FROM categories WHERE name = 'سور القرآن';
