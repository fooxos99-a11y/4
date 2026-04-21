-- إضافة فئة "عالم الحيوان" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('عالم الحيوان')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما هو أسرع حيوان بري؟', 'الفهد', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو أكبر حيوان من الثديات؟', 'الحوت الأزرق', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'كم عدد أرجل الأخطبوط؟', 'ثمانية', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان المعروف بـ "ملك الغابة"؟', 'الأسد', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان الذي يعرف بوجود جيب يحمل فيه صغاره؟', 'الكنغر', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'كم عدد القلوب لدى الأخطبوط؟', 'ثلاثة', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو أطول حيوان في العالم؟', 'الزرافة', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الغذاء الرئيسي للباندا؟', 'الخيزران', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان المعروف بخطوطه السوداء والبيضاء؟', 'الحمار الوحشي', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان الغير قادر على القفز؟', 'الفيل', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما أضخم الحيوانات من حيث الحجم؟', 'الحوت الأزرق', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'من هي الحشرة التي نبهت قومها من جيش سيدنا سليمان؟', 'النملة', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الطائر الذي كان يتكلم؟', 'هدهد سيدنا سليمان', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو أبطأ حيوان في العالم؟', 'الكسلان', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان الذي ينتحر إذا اقترب من النار؟', 'العقرب', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما الحيوان الذي يمكنه النوم بعين واحدة مفتوحة؟', 'الدلفين', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما الحيوان الذي يمتلك أقوى فك في العالم؟', 'التمساح', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الرمز الذي يتم التعبير عن السلام به؟', 'الحمامة', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'من هو الحيوان الذي لديه القدرة أن يفتح فمه إلى أوسع نطاق؟', 'فرس النهر', 200
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الطائر الذي يضع أكبر بيضة؟', 'النعامة', 200
FROM categories WHERE name = 'عالم الحيوان';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما هو الحيوان الثدي الوحيد الذي يمكنه الطيران الحقيقي؟', 'الخفاش', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هي مدة حمل الفيل؟', '22 شهرًا', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'من هو الحيوان الذي أماته الله ثم حياه؟', 'حمار العزيز', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'من هو الطائر الذي دفن أخيه؟', 'الغراب', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'من هو الحيوان الذي تم اتهامه بقتل سيدنا يوسف عليه السلام؟', 'الذئب', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'من هو الحيوان الذي نام مع أصحابه؟', 'كلب أصحاب الكهف', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان الذي أبطل السحر؟', 'الثعبان الذي كان في الأصل عصا سيدنا موسى', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'من هو الحيوان الذي قام بسجن نبي بأمر الله؟', 'الحوت', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'من هو الحيوان الذي رفض أمر صاحبه خوفًا من الله عز وجل؟', 'فيل أبرهة الحبشي', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان البحري الذي إذا قطع زراعه، يستطيع تعويضها مرة أخرى؟', 'نجم البحر', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الاسم الذي يطلق على بيت الدجاج؟', 'القن', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الاسم الذي يطلق على صغير الضفدع؟', 'الشرعوف', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'في أي قارة تعيش الزرافات؟', 'قارة إفريقيا', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'كم عدد أجنحة النحلة؟', '4 أجنحة', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو أكبر أنواع القطط؟', 'النمر السيبيري', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو أضخم الطيور؟', 'النعامة', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هي أكثر الأفاعي سمية في العالم؟', 'أفعى التايبان الداخلية', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ماذا يسمى صغير الكنغر؟', 'جوي', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'من هم أول الطيور التي قام الإنسان بتربيتها؟', 'الدجاج', 400
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الاسم الذي يطلق على الصقر؟', 'الهيثم', 400
FROM categories WHERE name = 'عالم الحيوان';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما اسم أنثى الغزال؟', 'ظبية', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'كم عدد حجرات القلب التي يمتلكها الصرصور؟', '12 حجرة', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان الذي يمتلك أعلى ضغط للدم؟', 'الزرافة', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان الذي لا يحترق بالنار؟', 'السمندل', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'من هو الحيوان الذي يمتلك أطول لسان نسبةً لطول جسمه؟', 'الحرباء', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'من ماذا تتكون قرون وحيد القرن؟', 'الشعر', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان المكسيكي الأصلع؟', 'الكلب', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو أقوى حيوان عضليًا نسبةً لحجمه؟', 'خنفساء الروث', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما الحيوان الذي يمتلك أكبر عيون في العالم؟', 'الحبار العملاق', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو أطول حيوان في العالم؟', 'دودة الخيط (نماتودا)', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما الحيوان الذي يمتلك أكبر دماغ نسبةً لحجمه؟', 'النملة', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو أعلى حيوان يطير في السماء؟', 'النسر الملتحي', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما الحيوان الذي يمكنه تحمل درجات حرارة تصل إلى 50 مئوية؟', 'النمل الفضي الصحراوي', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان الذي يمتلك أطول عمر في البرية؟', 'سلحفاة غالاباغوس', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما الحيوان الذي يمتلك أطول أنياب في العالم؟', 'الناروال (حوت أحادي القرن)', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان الوحيد الذي يمكنه الطيران للخلف؟', 'الطائر الطنان', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما الحيوان الذي يمتلك أكبر عدد من الأسنان في فمه؟', 'الحلزون', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما هو الحيوان الذي يمكنه البقاء على قيد الحياة بعد تجميده بالكامل؟', 'ضفدع الخشب', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما الحيوان الذي ينتج أعلى صوت نسبةً لحجمه؟', 'جمبري المسدس', 600
FROM categories WHERE name = 'عالم الحيوان'
UNION ALL
SELECT categories.id, 'ما الحيوان الذي يمتلك أقوى حاسة شم في العالم؟', 'الفيل', 600
FROM categories WHERE name = 'عالم الحيوان';
