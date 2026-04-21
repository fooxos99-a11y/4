-- إضافة فئة "كلمات القرآن" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('كلمات القرآن')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما معنى كلمة صيب (او كصيب من السماء فيه ظلمات ورعد وبرق يجعلون اصابعهم في اذانهم من الصواعق حذر الموت والله محيط بالكافرين)', 'مطر شديد', 200
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة اندادا (وجعلوا لله اندادا ليضلوا عن سبيله قل تمتعوا فان مصيركم الى النار)', 'نظراء وأمثالا', 200
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة العاديات (والعاديات ضبحا)', 'الخيل', 200
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة محراب (فخرج على قومه من المحراب فأوحى اليهم ان سبحوا بكرة وعشيا)', 'مكان العبادة', 200
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة عاقر (قال ربي انى يكون لى غلام وقد بلغنى الكبر وامرأتي عاقر قال كذلك الله يفعل ما يشاء)', 'عقيم لا تلد', 200
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة ريب (ذلك الكتاب لا ريب فيه هدى للمتقين)', 'شك', 200
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة غشاوة (ختم الله على قلوبهم وعلى سمعهم وعلى ابصارهم غشاوة ولهم عذاب عظيم)', 'غطاء', 200
FROM categories WHERE name = 'كلمات القرآن';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما معنى كلمة زيغ (هو الذي انزل عليك الكتاب منه ايات محكمات هن ام الكتاب واخر متشابه فاما الذين في قلوبهم زيغ فيتبعون ما تشابه منه ابتغاء الفتنة)', 'مرض وانحراف', 400
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة فتيلًا (الم يحسب الذين يزكون انفسهم بل الله يزكي من يشاء ولا يظلمون فتيلًا)', 'الخيط الذي يكون في شق نواة التمر', 400
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة القناطير المقنطرة (زين للناس حب الشهوات من النساء والبنين والقناطير المقنطرة من الذهب والفضة)', 'الأموال الكثيرة من الذهب والفضة', 400
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة يتخبطه (الذين ياكلون الربوا لا يقومون الا كما يقوم الذي يتخبطه الشيطان من المس)', 'يصرعه', 400
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة تولج (تولج الليل في النهار وتولج النهار في الليل وتخرج الحي من الميت وتخرج الميت من الحي وترزق من تشاء بغير حساب)', 'تدخل', 400
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة الآفلين (فلما جن عليه الليل راى كوكبا قال هذا ربي فلما افل قال لا احب الآفلين)', 'الغائبين', 400
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة عائلًا (ووجدك عائلًا فأغنى)', 'فقيرًا', 400
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة جيدها (في جيدها حبل من مسد)', 'عنقها', 400
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة الفلق (قل اعوذ برب الفلق)', 'الصبح', 400
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة قسورة (فرت من قسورة)', 'أسد كاسر', 400
FROM categories WHERE name = 'كلمات القرآن';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما معنى كلمة كلالة (يستفتونك قل الله يفتكم في الكلالة ان امرؤ هل كلاله ليس له ولد وله اخت فلها نصف)', 'من ليس له ولد ولا والد', 600
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة العشار (واذا العشار عطلت)', 'النياق الحوامل', 600
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة سعرت (واذا الجحيم سعرت)', 'أوقدت', 600
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة الأرائك (متكئين فيها على الأرائك لا يرون فيها شمسًا ولا زمهريرًا)', 'السرر المزينة بالستُور والثياب', 600
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة الثاقب (النجم الثاقب)', 'المضيء المتوهج', 600
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة سجيل (ترميهم بحجارة من سجيل)', 'طين متحجر', 600
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة كثيبًا (يوم ترجف الارض والجبال وكانت الجبال كثيبًا مهيلًا)', 'رملًا مجتمعًا', 600
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة يعمهون (الله يستهزئ بهم ويمدهم في طغيانهم يعمهون)', 'يتحيرون', 600
FROM categories WHERE name = 'كلمات القرآن'
UNION ALL
SELECT categories.id, 'ما معنى كلمة العهن (وتكون الجبال كالعهن المنفوش)', 'كالصوف المصبوغ بألوان مختلفة', 600
FROM categories WHERE name = 'كلمات القرآن';
