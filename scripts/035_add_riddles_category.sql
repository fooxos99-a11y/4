-- إضافة فئة "ألغاز" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('ألغاز')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما هو الشيء الذي يكتب ولا يقرأ؟', 'القلم', 200
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي تراه ولا تستطيع لمسه؟', 'الهواء', 200
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي لا يمكنك رؤيته في الليل؟', 'الظلام', 200
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يزداد كلما أخذت منه؟', 'الحفرة', 200
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يتحرك دائماً ولكنه لا يذهب إلى أي مكان؟', 'عقارب الساعة', 200
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يمكن أن يجري ولكن لا يمشي؟', 'النهر', 200
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يشبه البحيرة ولكنه ليس ماء؟', 'المرآة', 200
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'اسم فاكهة إن قلبته بقي على حاله؟', 'توت، خوخ', 200
FROM categories WHERE name = 'ألغاز';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما هو الشيء الذي يتنفس ولكن لا يحتوي على رئتين؟', 'النباتات', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يأتي بين السماء والأرض؟', 'الحرف "و"', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يمكنك سماعه ولكن لا يمكنك رؤيته؟', 'الصوت', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يحتوي على أسنان ولكنه لا يعض؟', 'المشط', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يملكه الجميع ولكن يستخدمه الآخرون أكثر منك؟', 'اسمك', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الموجود بالسماء، ولو قمنا بإضافة حرف له لأصبح في الأرض؟', 'نجم → منجم', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'اسم ولد مكون من 4 أحرف، لو حذفنا آخر حرف منه صار اسم قريب من الأقرباء؟', 'خالد → خال', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'هناك مجموعة من الأشخاص جلسوا تحت نخلة… إذا سقطت تفاحة من منهم سوف يلتقطها أولاً؟', 'لن يلتقطها أحد لأن النخلة لا تطرح تفاح', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما اسم الشيء الذي يسير من غير أقدام ويطير من غير أجنحة، ولا يمتلك عيون وبالرغم من هذا يبكي؟', 'السحابة', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي نحملها على الأرض، ويحملنا في البحر؟', 'القارب', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي ليس له بداية ولا نهاية؟', 'الدائرة', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يمتلك 4 أرجل ولكن لا يمشي؟', 'الطاولة', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي لا يمشي إلا بالضرب؟', 'المسمار', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما الذي يمكن أن يملأ الغرفة ولكنه لا يشغل مساحة؟', 'الضوء', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هما الشيئان اللذان لا يمكنك تناولهما في وجبة الإفطار؟', 'الغداء والعشاء', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'إذا كنت قد حصلت علي، فإنّك تريد مشاركتي، وإذا شاركتني فأنت لم تحفظني، ما أنا؟', 'السر', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يكون في القرن مرة، وفي الدقيقة مرتين، ولا يوجد في اليوم؟', 'حرف القاف', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'أبوك لديه أربعة أبناء، شمال، جنوب، وشرق، فمن هو الابن الرابع؟', 'أنت', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي تحمله ويحملك؟', 'الحذاء', 400
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يدخل الماء ولا يبتل؟', 'الضوء', 400
FROM categories WHERE name = 'ألغاز';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'رجل إذا أعطاك قفاه حكمك وإذا أعطاك وجهه انتهى حكمه؟', 'الإمام في الصلاة', 600
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'لا يسمع ولا يرى ويعبر الطريق فمن هو؟', 'رجل أعمى وأصم', 600
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'أملك 5 أصابع ولكن لا أستطيع الإمساك بشيء. ما أنا؟', 'القفاز', 600
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي له رقبة بلا رأس، وذراعان بلا يدين، وجسم بلا أرجل؟', 'القميص', 600
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي يولد كل شهر، يعيش أيامًا قليلة، ثم يموت تدريجيًا حتى يختفي؟', 'الهلال', 600
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'أنا كلمة إذا نطقت بي صمتّ، وإذا صمتّ نطقتُ، وأنا دائمًا معك لكنك لا تلمسني. ما أنا؟', 'الصمت', 600
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'أنا أبني وأهدم في نفس الوقت، أعيش في الماء وأموت بالماء، وكلما كبرت صغرت. ما أنا؟', 'الموجة', 600
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'أنا أعيش في السماء، لكني أزور الأرض، أُعطي الحياة وأُخذها في نفس الوقت. من أنا؟', 'المطر', 600
FROM categories WHERE name = 'ألغاز'
UNION ALL
SELECT categories.id, 'أنا أرى كل شيء دون عينين، أحمل أسرارك لكن لا أفشيها، وأعيش معك لكنك لا ترى وجهي. من أنا؟', 'العقل', 600
FROM categories WHERE name = 'ألغاز';
