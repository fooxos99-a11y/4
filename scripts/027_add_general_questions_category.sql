-- إضافة فئة "أسئلة عامة" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('أسئلة عامة')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'من هو مخترع المصباح الكهربائي؟', 'توماس إديسون', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو الحيوان الذي يُلقب بـ "سفينة الصحراء"؟', 'الجمل', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'كم عدد قارات العالم؟', '7 قارات', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو أطول نهر في العالم؟', 'نهر النيل', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'من هما الطائران اللذان لا يستطيعان الطيران؟', 'النعامة والبطريق', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هي أشهر لوحة في العالم؟', 'الموناليزا', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هي أكبر دولة مساحة في العالم؟', 'روسيا', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو أكثر البحار دفئًا؟', 'البحر الأحمر', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'من هو أسرع الحيوانات؟', 'الفهد', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو أقوى الحيوانات ذاكرة؟', 'الدولفين', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو المكون الرئيسي للزجاج؟', 'الرمل', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'من كم لون يتكون قوس قزح؟', '7 ألوان', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو عدد كواكب المجموعة الشمسية؟', '8 كواكب', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'متى فُرض الصيام على المسلمين؟', 'في العام الهجري الثاني', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'من هو النبي الذي كانت معجزته إحياء الموتى؟', 'نبي الله عيسى عليه السلام', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'كم عدد الأسنان في فم الإنسان البالغ؟', '32 سنًا', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'من هو مؤسس علم الجبر؟', 'الخوارزمي', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي يوجد فيها تمثال "الحرية"؟', 'الولايات المتحدة الأمريكية', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تشتهر بإنتاج السوشي؟', 'اليابان', 200
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هي أصغر قارة في العالم من حيث المساحة؟', 'أستراليا', 200
FROM categories WHERE name = 'أسئلة عامة';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'أين توجد أعلى قمة جبلية في العالم؟', 'جبال الهيمالايا (إيفرست)', 400
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي اهتز عرش الرحمن لموته؟', 'سعد بن معاذ', 400
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هما العضوان اللذان يستمران بالنمو طوال حياة الإنسان؟', 'الأنف والأذن', 400
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'في أي قارة يقع نهر الأمازون؟', 'أمريكا الجنوبية', 400
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو أكبر محيط في العالم؟', 'المحيط الهادئ', 400
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هي أطول عظمة في جسم الإنسان؟', 'عظمة الفخذ', 400
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو مقياس سرعة السفن؟', 'العقدة', 400
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هي أضعف حواس الطيور؟', 'حاسة الشم', 400
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو أكبر كوكب في المجموعة الشمسية؟', 'المشتري', 400
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو الكوكب الذي يُعرف بالكوكب الأحمر؟', 'المريخ', 400
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو أكبر حيوان في البرية؟', 'الفيل الأفريقي', 400
FROM categories WHERE name = 'أسئلة عامة';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما هو الكوكب الوحيد الذي يدور حول محوره باتجاه عقارب الساعة؟', 'الزهرة', 600
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو أصغر عظم في جسم الإنسان؟', 'عظم الركاب (Stapes)', 600
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو أسرع حيوان مائي؟', 'سمكة الشراع', 600
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'كم عدد أعضاء مجلس الأمن؟', '15 عضوًا', 600
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو اسم القارة التي لا تحتوي على أنهار؟', 'أستراليا', 600
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو أعمق مكان في المحيطات؟', 'خندق ماريانا', 600
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هي أكبر بحيرة في العالم من حيث المساحة؟', 'بحيرة قزوين', 600
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هي أكبر مدينة في العالم من حيث عدد السكان؟', 'طوكيو', 600
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هي القارة الأكثر جفافًا على وجه الأرض؟', 'القارة القطبية الجنوبية', 600
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو الاسم القديم لمدينة الرياض؟', 'حجر اليمامة', 600
FROM categories WHERE name = 'أسئلة عامة'
UNION ALL
SELECT categories.id, 'ما هو اسم النهر الذي يمر عبر أكثر من 10 دول أوروبية؟', 'نهر الدانوب', 600
FROM categories WHERE name = 'أسئلة عامة';
