-- إضافة فئة "إسلامي" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('إسلامي')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'كم عدد الأشهر الحرم؟', '4', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي ابتلعه الحوت؟', 'يونس عليه السلام', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي سخر الله له الريح؟', 'سليمان عليه السلام', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'كم كان عمر النبي ﷺ عندما نزل عليه الوحي؟', '40 سنة', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'ما هي السورة التي ذكر فيها فرض الصيام؟', 'البقرة', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'كم عدد التكبيرات في صلاة الجنازة؟', 'أربع تكبيرات', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الخليفة الذي جمع القرآن في مصحف واحد؟', 'عثمان بن عفان رضي الله عنه', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي تبرأ من ابنه لأنه كان من الكافرين؟', 'نوح عليه السلام', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي أعطاه الله الملك والحكمة وجعل الجبال تسبح معه؟', 'داود عليه السلام', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي فُقد ابنه وأصيب بالعمى من كثرة البكاء؟', 'يعقوب عليه السلام', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'كم كان عمر النبي عندما تزوج السيدة خديجة؟', '25 عامًا', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي دعا له النبي بأن يكون فقيهًا في الدين؟', 'عبد الله بن عباس رضي الله عنه', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي كان قومه ينحتون الجبال بيوتًا؟', 'صالح عليه السلام', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي عاش 950 عامًا يدعو قومه؟', 'نوح عليه السلام', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي أرسل إلى قوم مدين؟', 'شعيب عليه السلام', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'ما اسم النبي الذي كان يُلقب بـ "الصديق"؟', 'يوسف عليه السلام', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو أشهر من كتب الوحي للنبي محمد؟', 'زيد بن ثابت رضي الله عنه', 200
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي رفع ابويه على العرش؟', 'يوسف عليه السلام', 200
FROM categories WHERE name = 'إسلامي';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'كم كان عمر النبي ﷺ عندما توفيت والدته؟', '6 سنوات', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'كم سنة استمرت دعوة النبي ﷺ في مكة قبل الهجرة؟', '13 سنة', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'كم مرة ورد اسم "جبريل" في القرآن الكريم؟', '3 مرات', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي جاء بعد موسى وكان قائدًا لبني إسرائيل؟', 'يوشع بن نون عليه السلام', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي سأل الله أن يريه كيف يحيي الموتى؟', 'إبراهيم عليه السلام', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو أول سفير في الإسلام؟', 'مصعب بن عمير رضي الله عنه', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي أشار بحفر الخندق في غزوة الأحزاب؟', 'سلمان الفارسي رضي الله عنه', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي كان أعلم الأمة بالحلال والحرام؟', 'معاذ بن جبل رضي الله عنه', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'في أي غزوة جُرح النبي وكُسرت رباعيته؟', 'غزوة أحد', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'ما هو العام الذي سُمي بعام الفتح؟', 'عام 8 هـ، عند فتح مكة', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'ما اسم الصحابي الذي أُمر بتدوين الوحي؟', 'زيد بن ثابت', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هم أولي العزم من الرسل؟', 'نوح، وإبراهيم، وموسى، وعيسى، ومحمد عليهم السلام', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي بشره النبي ﷺ بالجنة دون أن يصلي ركعة واحدة؟', 'عمرو بن ثابت', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'في أي معركة استُشهد حمزة بن عبد المطلب؟', 'معركة أحد', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'ما اسم والد النبي إبراهيم عليه السلام؟', 'آزر', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو أول من أسلم من الصبيان؟', 'علي بن أبي طالب رضي الله عنه', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي سمع النبي صوت نعليه في الجنة؟', 'بلال بن رباح رضي الله عنه', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو النبي الذي جاء ذكره في كل الأديان السماوية؟', 'إبراهيم عليه السلام', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي كان يُعرف بأسد الله؟', 'حمزة بن عبد المطلب رضي الله عنه', 400
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'ما هي الأشهر الحرم؟', 'ذو القعدة، ذو الحجة، محرم، رجب', 400
FROM categories WHERE name = 'إسلامي';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'كم عدد الغزوات التي قادها النبي ﷺ بنفسه؟', '27 غزوة', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'كم كان عمر الخليفة عمر بن الخطاب رضي الله عنه عندما استشهد؟', '63 سنة', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي نام في فراش النبي ليلة الهجرة؟', 'علي بن أبي طالب رضي الله عنه', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي بشره النبي بالجنة وهو يمشي على الأرض؟', 'عبد الله بن سلام رضي الله عنه', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي كان أول من رمى بسهم في سبيل الله؟', 'سعد بن أبي وقاص رضي الله عنه', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي كان يسمى "أمين هذه الأمة"؟', 'أبو عبيدة الجراح', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو التابعي الذي لُقب بـ "الإمام الأعظم"؟', 'الإمام أبو حنيفة', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي دافع عن النبي في غزوة أحد حتى شلت يده؟', 'طلحة بن عبيد الله رضي الله عنه', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي كان مستجاب الدعوة؟', 'سعد بن أبي وقاص رضي الله عنه', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي اشترى بئر رومة وجعلها صدقة للمسلمين؟', 'عثمان بن عفان رضي الله عنه', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي أرسله النبي إلى المدينة ليعلم أهلها الإسلام؟', 'مصعب بن عمير رضي الله عنه', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي تولى القضاء في عهد عمر بن الخطاب؟', 'شريح القاضي', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'ما هو اسم الشخص الذي حاول قتل النبي بوضع السم في طعامه؟', 'زينب بنت الحارث', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'ما هو أول لواء عقده النبي في الإسلام؟', 'لواء حمزة بن عبد المطلب', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي نزلت فيه آية "ومن الناس من يشري نفسه ابتغاء مرضات الله"؟', 'صهيب الرومي رضي الله عنه', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'من هو الصحابي الذي قُتل غدرًا في بئر معونة؟', 'عامر بن فهيرة رضي الله عنه', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'ما هو اسم السيف المشهور للنبي محمد عليه الصلاة والسلام؟', 'ذو الفقار', 600
FROM categories WHERE name = 'إسلامي'
UNION ALL
SELECT categories.id, 'ما هي المعركة التي أدت بعد وقوعها إلى جمع القرآن؟', 'معركة اليمامة', 600
FROM categories WHERE name = 'إسلامي';
