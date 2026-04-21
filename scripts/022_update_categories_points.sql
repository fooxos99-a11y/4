-- تحديث نقاط الأسئلة إلى 200، 200، 400، 400، 600، 600
-- لجميع الفئات

-- تحديث القرآن الكريم
UPDATE category_questions SET points = 200, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'القرآن الكريم')
AND question = 'كم عدد سور القرآن الكريم؟';

UPDATE category_questions SET points = 200, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'القرآن الكريم')
AND question = 'ما أطول سورة في القرآن؟';

UPDATE category_questions SET points = 400, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'القرآن الكريم')
AND question LIKE '%أقصر سورة%';

UPDATE category_questions SET points = 400, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'القرآن الكريم')
AND question = 'كم عدد أجزاء القرآن الكريم؟';

UPDATE category_questions SET points = 600, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'القرآن الكريم')
AND question LIKE '%قلب القرآن%';

-- تحديث السيرة النبوية
UPDATE category_questions SET points = 200, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'السيرة النبوية')
AND question LIKE '%عام ولد%';

UPDATE category_questions SET points = 200, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'السيرة النبوية')
AND question LIKE '%عمر%البعثة%';

UPDATE category_questions SET points = 400, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'السيرة النبوية')
AND question LIKE '%زوجة%الأولى%';

UPDATE category_questions SET points = 400, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'السيرة النبوية')
AND question LIKE '%حمزة%';

UPDATE category_questions SET points = 600, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'السيرة النبوية')
AND (question LIKE '%أول من أسلم%' OR question LIKE '%غزوات%');

-- تحديث الصحابة
UPDATE category_questions SET points = 200, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'الصحابة')
AND question LIKE '%أول خليفة%';

UPDATE category_questions SET points = 200, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'الصحابة')
AND question LIKE '%الفاروق%';

UPDATE category_questions SET points = 400, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'الصحابة')
AND (question LIKE '%حبر الأمة%' OR question LIKE '%ذي النورين%' OR question LIKE '%أسد الله%');

UPDATE category_questions SET points = 600, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'الصحابة')
AND (question LIKE '%حواري%' OR question LIKE '%ترجمان%');

-- تحديث الفقه
UPDATE category_questions SET points = 200, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'الفقه')
AND (question LIKE '%أركان الإسلام%' OR question LIKE '%ركعات%الفجر%');

UPDATE category_questions SET points = 400, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'الفقه')
AND (question LIKE '%نصاب%زكاة%' OR question LIKE '%رمضان%' OR question LIKE '%أشواط%');

UPDATE category_questions SET points = 600, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'الفقه')
AND question LIKE '%شروط%الحج%';

-- تحديث العقيدة
UPDATE category_questions SET points = 200, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'العقيدة')
AND (question LIKE '%أركان الإيمان%' OR question LIKE '%أول ركن%');

UPDATE category_questions SET points = 400, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'العقيدة')
AND (question LIKE '%الملائكة%' OR question LIKE '%قبره%');

UPDATE category_questions SET points = 600, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'العقيدة')
AND (question LIKE '%الكتب السماوية%' OR question LIKE '%أعظم آية%');

-- تحديث التاريخ الإسلامي
UPDATE category_questions SET points = 200, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'التاريخ الإسلامي')
AND (question LIKE '%بدر%' OR question LIKE '%فتحت مكة%');

UPDATE category_questions SET points = 400, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'التاريخ الإسلامي')
AND (question LIKE '%فتح%مصر%' OR question LIKE '%خالد بن الوليد%');

UPDATE category_questions SET points = 600, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'التاريخ الإسلامي')
AND (question LIKE '%الدولة الأموية%' OR question LIKE '%المدارس%');

-- تحديث الأخلاق
UPDATE category_questions SET points = 200, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'الأخلاق')
AND (question LIKE '%أفضل%الأخلاق%' OR question LIKE '%أعظم كلمة%');

UPDATE category_questions SET points = 400, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'الأخلاق')
AND (question LIKE '%الميزان%' OR question LIKE '%أفضل صدقة%');

UPDATE category_questions SET points = 600, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'الأخلاق')
AND (question LIKE '%لا يدخل الجنة%' OR question LIKE '%أحب الأعمال%');

-- تحديث العبادات
UPDATE category_questions SET points = 200, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'العبادات')
AND (question LIKE '%أول صلاة فرضت%' OR question LIKE '%عدد الصلوات%');

UPDATE category_questions SET points = 400, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'العبادات')
AND (question LIKE '%ليلة القدر%' OR question LIKE '%وقت%الفجر%');

UPDATE category_questions SET points = 600, updated_at = NOW()
WHERE category_id IN (SELECT id FROM categories WHERE name = 'العبادات')
AND (question LIKE '%أركان الصلاة%' OR question LIKE '%شروط%الزكاة%');
