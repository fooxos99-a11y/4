-- إضافة فئة "دول وعواصم" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('دول وعواصم')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما عاصمة فرنسا؟', 'باريس', 200
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها القاهرة؟', 'مصر', 200
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة إيطاليا؟', 'روما', 200
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها نيودلهي؟', 'الهند', 200
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة تونس؟', 'تونس', 200
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة إسبانيا؟', 'مدريد', 200
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها أنقرة؟', 'تركيا', 200
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة المملكة المتحدة؟', 'لندن', 200
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها واشنطن العاصمة؟', 'الولايات المتحدة الأمريكية', 200
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة الأردن؟', 'عمّان', 200
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها الجزائر؟', 'الجزائر', 200
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة البرازيل؟', 'برازيليا', 200
FROM categories WHERE name = 'دول وعواصم';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما عاصمة السويد؟', 'ستوكهولم', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها كانبيرا؟', 'أستراليا', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة كندا؟', 'أوتاوا', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها أوسلو؟', 'النرويج', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة كوريا الجنوبية؟', 'سول (سيول)', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها بوينس آيرس؟', 'الأرجنتين', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة إثيوبيا؟', 'أديس أبابا', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها كوالالمبور؟', 'ماليزيا', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة المغرب؟', 'الرباط', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها بانكوك؟', 'تايلاند', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة فنزويلا؟', 'كاراكاس', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها بروكسل؟', 'بلجيكا', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها طرابلس؟', 'ليبيا', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة الصين؟', 'بكين', 400
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة ألمانيا؟', 'برلين', 400
FROM categories WHERE name = 'دول وعواصم';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما الدولة التي عاصمتها تيمفو؟', 'بوتان', 600
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة كازاخستان؟', 'أستانا', 600
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها ياوندي؟', 'الكاميرون', 600
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها صوفيا؟', 'بلغاريا', 600
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها كيتو؟', 'الإكوادور', 600
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة بيرو؟', 'ليما', 600
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة غينيا الاستوائية؟', 'مالابو', 600
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما الدولة التي عاصمتها هلسنكي؟', 'فنلندا', 600
FROM categories WHERE name = 'دول وعواصم'
UNION ALL
SELECT categories.id, 'ما عاصمة جزر القمر؟', 'موروني', 600
FROM categories WHERE name = 'دول وعواصم';
