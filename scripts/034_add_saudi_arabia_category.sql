-- إضافة فئة "السعودية" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('السعودية')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما اسم الحقل الذي يُعد الأكبر في العالم؟', 'حقل الغوار', 200
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما هو اليوم الوطني السعودي؟', '23 سبتمبر', 200
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'كم عدد مناطق المملكة الإدارية؟', '13 منطقة', 200
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما اسم أشهر مهرجان ثقافي في السعودية؟', 'مهرجان الجنادرية', 200
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما هو رمز الاتصال الدولي للمملكة؟', '+966', 200
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما هي أول جامعة سعودية؟', 'جامعة الملك سعود', 200
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما هي أعلى قمة جبلية في السعودية؟', 'جبل السودة', 200
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما اسم أول عاصمة للدولة السعودية الأولى؟', 'الدرعية', 200
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'من هو أول رائد فضاء سعودي؟', 'الأمير سلطان بن سلمان', 200
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما هي أكبر شركة نفطية في المملكة؟', 'شركة أرامكو السعودية', 200
FROM categories WHERE name = 'السعودية';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'في أي عام تم إطلاق رؤية السعودية 2030؟', '2016', 400
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما اسم المبادرة البيئية التي أطلقتها المملكة عام 2021؟', 'مبادرة السعودية الخضراء', 400
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما اسم البحر الذي تطل عليه المملكة من الغرب؟', 'البحر الأحمر', 400
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما هو أشهر جبل في مكة؟', 'جبل عرفات', 400
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما اسم أشهر وادٍ في الرياض؟', 'وادي حنيفة', 400
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما اسم مقر الحكم في الرياض؟', 'قصر اليمامة', 400
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'متى تم السماح للمرأة السعودية بقيادة السيارة؟', 'عام 2018', 400
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'من هو أول وزير خارجية سعودي؟', 'الملك فيصل بن عبد العزيز', 400
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما هي اسم مدينة سعودية تُعرف بمدينة الورود؟', 'الطائف', 400
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما اسم المؤسسة المسؤولة عن تطوير مشاريع رؤية 2030؟', 'صندوق الاستثمارات العامة', 400
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما اسم الجبل الذي يقع في مدينة الطائف ويُعد وجهة سياحية صيفية؟', 'جبل الهدا', 400
FROM categories WHERE name = 'السعودية';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'في أي عام تأسست المملكة العربية السعودية؟', '1932م', 600
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما اسم الحصن التاريخي الذي يقع في نجران؟', 'قلعة رعوم', 600
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'في أي عام تم افتتاح جامعة الأميرة نورة؟', '2008', 600
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما هو أطول طريق سريع في المملكة؟', 'الطريق السريع رقم 10 (يمتد من مدينة حرض إلى مركز الحدود البطحاء)', 600
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما هو أول استاد رياضي تم افتتاحه في المملكة؟', 'استاد الأمير فيصل بن فهد في الرياض', 600
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'من هو أول سفير سعودي في الأمم المتحدة؟', 'جميل بارودي', 600
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'ما هو أكبر منتجع شاطئي في المملكة؟', 'منتجع البحر الأحمر في أملج', 600
FROM categories WHERE name = 'السعودية'
UNION ALL
SELECT categories.id, 'متى تم تدشين برج المملكة في الرياض؟', '2002', 600
FROM categories WHERE name = 'السعودية';
