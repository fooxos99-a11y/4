-- إضافة فئة "القرآن الكريم" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('القرآن الكريم')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما السورة التي تحتوي على أطول آية في القرآن؟', 'سورة البقرة (الآية 282)', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما السورة المكونة من حرفين وبدأت بحرفين مقطعين فقط؟', 'سورة طه', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما السورة التي ذكرت كلمة "الناس" 5 مرات؟', 'سورة الناس', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما السورة التي تحتوي على كلمة "القدر" 3 مرات؟', 'سورة القدر', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما هي السورة التي لا تبدأ بالبسملة؟', 'سورة التوبة', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما هي السورة التي تحتوي على بسملتين؟', 'سورة النمل', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'في أي غار نزل أول وحي على النبي ﷺ؟', 'غار حراء', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'كم سنة استغرق نزول القرآن الكريم؟', '23 سنة', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'كم عدد حملة العرش كما ذكر في القرآن الكريم؟', 'ثمانية', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما السورتان اللتان سُمّيتا باسمين من أوقات الصلاة؟', 'سورتي العصر والفجر', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'في أي سورة هذه الآية؟', 'سورة البقرة', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'في أي سورة هذه الآية؟', 'سورة التوبة', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'في أي سورة هذه الآية؟', 'سورة الصافات', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'في أي سورة هذه الآية؟', 'سورة عبس', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'من المتكلم بهذه الآية؟', 'نوح', 200
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'من هي الفئة الخامسة في هذه الآية؟', 'ابن السبيل', 200
FROM categories WHERE name = 'القرآن الكريم';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما السورة الوحيدة التي ذكر فيها اسم "يونس"؟', 'سورة يونس', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما السورة رقم 50 في ترتيب المصحف؟', 'سورة ق', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'كم عدد السور التي بدأت بـ "الحمد لله"؟', '5 (الفاتحة، الأنعام، الكهف، سبأ، فاطر)', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما السورة التي ذكرت كلمة "القرآن" أكثر من غيرها؟', 'سورة الإسراء', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'كم عدد السور التي تبدأ بحروف مقطعة؟', '29 سورة', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما السورة التي ذكرت كلمة "الرحمن" 16 مرة؟', 'سورة مريم', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'كم عدد السور المكية في القرآن؟', '86 سورة', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'كم عدد السور التي تبدأ بـ "الم"؟', '6 سور (البقرة، آل عمران، العنكبوت، الروم، لقمان، السجدة)', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما هي السورة التي نزلت كاملة مرة واحدة؟', 'سورة المدثر', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما هي السورة التي تسمى بـ "سنام القرآن"؟', 'سورة البقرة', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'أذكر اسم السورة التي تسمى سورة العقود؟', 'سورة المائدة', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'في أي سورة هذه الآية؟', 'سورة غافر', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'في أي سورة هذه الآية؟', 'سورة إبراهيم', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'من المتكلم بهذه الآية؟', 'امرأة العزيز', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'من المقصودون في هذه الآية؟', 'بني إسرائيل', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما معنى (بحيرة) في هذه الآية؟', 'الناقة التي تُقطع أذنها إذا أنجبت عددًا', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'من المقصود بهذه الآية؟', 'أصحاب الكهف', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'من الشخص الذي كان مع موسى؟', 'يوشع بن نون', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما اسم السورة التي كانت سببًا في دخول عمر بن الخطاب في الإسلام؟', 'سورة طه', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'من أشهر من كتب الوحي للنبي ﷺ؟', 'زيد بن ثابت', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما السورة التي تحتوي على اسم "الله" في كل آية؟', 'المجادلة', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما هي السورة التي تُسمى "سورة النساء الصغرى"؟', 'سورة الطلاق', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما هي السورة التي تسمى "سورة المؤمن"؟', 'سورة غافر', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما اسم الجبلين اللذين تم ذكرهما في نفس الآية؟', 'الصفا والمروة', 400
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'في أي السورة تم فيها ذكر قصة قابيل وهابيل؟', 'سورة المائدة', 400
FROM categories WHERE name = 'القرآن الكريم';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما أول سورة نزلت في المدينة؟', 'سورة البقرة', 600
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'كم عدد الآيات في سورة يوسف؟', '111 آية', 600
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما اسم السورة التي في بدايتها ونهايتها تسبيح؟', 'سورة الحشر', 600
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'أول رقم تم ذكره في القرآن الكريم؟', 'سبعة', 600
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ماهي الثلاث ألوان التي تم ذكرها في القرآن الكريم؟', 'اللون الأسود، الأصفر، والأبيض', 600
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'أذكر اسم السورة التي يطلق عليها سورة المرأة؟', 'سورة الممتحنة', 600
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'كم عدد المرات التي تم ذكر فيها اسم سيدنا موسى في سورة البقرة؟', '11 مرة', 600
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'كم عدد المرات التي تم ذكر الذهب بها في القرآن؟', 'ثمان مرات', 600
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما هو الشيء الذي حرمه الرسول صلى الله عليه وسلم على نفسه فعاتبه الله؟', 'العسل', 600
FROM categories WHERE name = 'القرآن الكريم'
UNION ALL
SELECT categories.id, 'ما هي السورة التي تحتوي على اسم "الله" في كل آية؟', 'المجادلة', 600
FROM categories WHERE name = 'القرآن الكريم';
