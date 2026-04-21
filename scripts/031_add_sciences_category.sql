-- إضافة فئة "علوم" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('علوم')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما هي الظاهرة التي تحدث عندما تُصبح الأرض بين الشمس والقمر؟', 'خسوف القمر', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو القانون الثالث لنيوتن في الحركة؟', 'لكل فعل رد فعل مساوٍ له في المقدار ومعاكس له في الاتجاه', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو نوع الطاقة التي نحصل عليها من الشمس؟', 'الطاقة الضوئية (أو الحرارية)', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو العنصر الذي يُشكل الجزء الأكبر من القشرة الأرضية؟', 'الأكسجين', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هي الوحدة التي نقيس فيها القوة؟', 'نيوتن', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هي المادة التي تُستخدم لتطهير الماء في المسبح؟', 'الكلور', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هي وظيفة الكلى في الجسم؟', 'تصفية الدم وإنتاج البول', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو الجزء من الجسم الذي يساعد على التوازن أثناء المشي؟', 'الأذن الداخلية', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما الذي يسبب تغير الفصول على الأرض؟', 'ميل محور الأرض أثناء دورانها حول الشمس', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'لماذا نرى البرق قبل سماع الرعد؟', 'الضوء يسافر أسرع من الصوت، فيرى البرق أولًا ثم يصل الصوت بعد تأخير', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما سبب المد والجزر؟', 'جاذبية القمر تسحب مياه البحر نحوها', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما الذي يحمي الأرض من الشمس؟', 'طبقة الأوزون في الغلاف الجوي', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو الكوكب الأقرب إلى الشمس؟', 'عطارد', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هي الوحدة التي نقيس بها درجة الحرارة؟', 'الدرجة المئوية (°C) أو الفهرنهايت (°F)', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هي المادة التي تحافظ على قوة العظام في الجسم؟', 'الكالسيوم', 200
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'كم عدد كواكب المجموعة الشمسية؟', 'ثمانية كواكب', 200
FROM categories WHERE name = 'علوم';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما هو الكوكب الذي يمكن أن يطفو على الماء لو وُضع في محيط عملاق؟', 'زحل (لأن كثافته أقل من الماء)', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو "السيموجراف"؟', 'جهاز رصد الزلازل', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'لماذا يصدأ الحديد؟', 'الحديد يتفاعل مع الأكسجين والماء ليكون أكسيد الحديد (الصدأ)', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما الذي يجعل الدم أحمر؟', 'الهيموغلوبين في الدم يحمل الأكسجين ويعطيه اللون الأحمر', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هي المادة التي تعطي النباتات لونها الأخضر؟', 'الكلوروفيل', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو اسم الكوكب الذي يمتلك أكبر عدد من الأقمار؟', 'كوكب المشتري', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو السبب في سماع صوت الرعد بعد رؤية البرق؟', 'لأن الضوء ينتقل أسرع من الصوت', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو العضو الذي يستهلك أكبر نسبة من الأكسجين في الجسم؟', 'الدماغ', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو العنصر الكيميائي الذي يرمز له بالرمز "Fe"؟', 'الحديد', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو العضو الذي يقوم بإنتاج خلايا الدم الحمراء؟', 'نخاع العظم', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو أقوى عضلة في جسم الإنسان بالنسبة لحجمها؟', 'عضلة الفك (الماضغة)', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'لماذا لا نسمع الصوت في الفضاء؟', 'لعدم وجود هواء', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هي الغدة المسؤولة عن إفراز هرمون النمو؟', 'الغدة النخامية', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو الكوكب الذي لديه أكبر عاصفة في نظامنا الشمسي؟', 'كوكب المشتري', 400
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو الغاز الذي يتسبب في ظاهرة الاحتباس الحراري؟', 'ثاني أكسيد الكربون', 400
FROM categories WHERE name = 'علوم';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما الذي يحدث في التفاعل النووي؟', 'النواة تنقسم أو تندمج لتطلق طاقة هائلة', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو الكوكب الذي يمتلك أقصر يوم في المجموعة الشمسية؟', 'المشتري (حوالي 10 ساعات)', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو أكبر قمر في المجموعة الشمسية؟', 'قمر جانيميد (التابع لكوكب المشتري)', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هي أول مادة بلاستيكية تم تصنيعها؟', 'الباكليت', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو الكوكب الذي يحتوي على أكبر حفرة بركانية في النظام الشمسي؟', 'المريخ (حفرة أوليمبوس مونس)', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هي المادة المظلمة؟', 'مادة غير مرئية تشكل حوالي 27% من الكون، تؤثر جاذبيًا على النجوم والمجرات', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو المكان الذي يوجد فيه مركز الزلزال؟', 'البؤرة', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما وحدة قياس الشحنة الكهربائية؟', 'كولوم', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو المرض الذي يحدث بسبب نقص فيتامين C في الجسم؟', 'الإسقربوط', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'لماذا لا يمكن للذهب أن يصدأ مثل الحديد؟', 'لأنه غير نشط كيميائيًا ولا يتفاعل مع الأكسجين بسهولة', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'لماذا لا يمكن للجسم أن يعيد بناء أعصاب الحبل الشوكي بعد القطع؟', 'الخلايا العصبية لا تتجدد بسهولة، والندوب تمنع إعادة الاتصال', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما الذي يجعل الجهاز المناعي يهاجم الجسم أحيانًا؟', 'يخطئ في تمييز خلايا الجسم كأجسام غريبة (مناعة ذاتية)', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما نوع الموجات التي لا تحتاج وسط للانتقال؟', 'الموجات الكهرومغناطيسية', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما الذي يجعل الملح يخفض درجة تجمد الماء؟', 'يتداخل مع جزيئات الماء ويصعب تكوين الجليد', 600
FROM categories WHERE name = 'علوم'
UNION ALL
SELECT categories.id, 'ما هو اسم النقطة في مدار كوكب حول الشمس حيث يكون الكوكب في أقرب مسافة من الشمس؟', 'الحضيض الشمسي (Perihelion)', 600
FROM categories WHERE name = 'علوم';
