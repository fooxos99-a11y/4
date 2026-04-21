-- إضافة فئة "جغرافيا" مع أسئلتها

-- إضافة الفئة
INSERT INTO categories (name) VALUES ('جغرافيا')
ON CONFLICT DO NOTHING;

-- إضافة الأسئلة (200 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما خط العرض الذي تقع عليه القاهرة؟', 'خط عرض 30', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما عاصمة البحرين؟', 'المنامة', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'لأي دولة تتبع المدن الآتية: مكناس، وجدة، وتطوان؟', 'المغرب', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'كم تغطي الصحراء الكبرى من مساحة الجزائر؟', '90%', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما سبب تسمية قمة إفرست بهذا الاسم؟', 'سُميت نسبة إلى المستكشف البريطاني "جورج إفرست"', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما الجزيرة التي تعرف باسم أرض النار والثلج؟', 'آيسلندا', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'أين تقع مدينة كوردوبا؟', 'في الأرجنتين', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما أكبر دولتين في قارة أمريكا الجنوبية؟', 'البرازيل والأرجنتين', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما أكثر ولاية من الولايات المتحدة الأمريكية سكانًا؟', 'كاليفورنيا', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي أكبر قارة في العالم من حيث المساحة؟', 'آسيا', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي القارة الوحيدة التي لا تحتوي على صحراء؟', 'أوروبا', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي أصغر دولة في العالم من حيث المساحة؟', 'الفاتيكان', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو أطول نهر في أمريكا الجنوبية؟', 'نهر الأمازون', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو أكبر خليج في العالم؟', 'خليج المكسيك', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي القارة التي تحتوي على أكبر كثافة سكانية؟', 'آسيا', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي القارة التي تقع فيها مصر؟', 'أفريقيا', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي عاصمة فرنسا؟', 'باريس', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'في أي قارة تقع الأرجنتين؟', 'أمريكا الجنوبية', 200
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تشتهر بساعة بيغ بن؟', 'بريطانيا (المملكة المتحدة)', 200
FROM categories WHERE name = 'جغرافيا';

-- إضافة الأسئلة (400 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'ما أكبر بركان في أوروبا؟', 'بركان إتنا في إيطاليا', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'أين تقع مياه طولون؟', 'في فرنسا', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'أين تقع مدينة كورك؟', 'في أيرلندا', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'أين تقع مدينتا بندر عباس ومشهد؟', 'في إيران', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'أين يوجد جبل طوبقال؟', 'في المغرب', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما أطول سلسلة جبال تحت الماء في العالم؟', 'سلسلة جبال وسط المحيط الأطلسي', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو البحر الذي يفصل بين شبه الجزيرة العربية وإفريقيا؟', 'البحر الأحمر', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي لديها أطول حدود برية مشتركة مع دول أخرى؟', 'روسيا (أكثر من 20,000 كيلومتر)', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو النهر الذي يمر عبر أكبر عدد من الدول؟', 'نهر الدانوب (10 دول)', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تقع فيها أكبر صحراء ساخنة في العالم؟', 'الجزائر (صحراء الصحراء الكبرى)', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي العاصمة الوحيدة في العالم التي تقع على خط الاستواء؟', 'كيتو (عاصمة الإكوادور)', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي ليس لها أي حدود برية مع دول أخرى؟', 'أيسلندا', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو أعلى شلال في العالم؟', 'شلال أنجل في فنزويلا (979 مترًا)', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تقع فيها بحيرة بايكال، أعمق بحيرة في العالم؟', 'روسيا', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تحتوي على أكبر عدد من المناطق الزمنية (بما فيها الأراضي الخارجية)؟', 'فرنسا (12 منطقة زمنية بسبب أراضيها ما وراء البحار)', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو البحر الذي يحتوي على أعلى نسبة ملوحة في العالم؟', 'البحر الميت (تقريبًا 33.7%)', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تقع فيها أكبر هضبة بركانية في العالم؟', 'الهند (هضبة الدكن)', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تحتوي على أكبر عدد من البحيرات في العالم؟', 'كندا (أكثر من 2 مليون بحيرة)', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو البحر الذي يقع بين مضيق جبل طارق والبحر الأسود؟', 'البحر الأبيض المتوسط', 400
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي القارة التي تحتوي على أقل عدد من الأنهار الدائمة؟', 'أستراليا', 400
FROM categories WHERE name = 'جغرافيا';

-- إضافة الأسئلة (600 نقطة)
INSERT INTO category_questions (category_id, question, answer, points)
SELECT categories.id, 'أين توجد أكبر قاعدة فرنسية خارج فرنسا؟', 'في جيبوتي', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو الخندق المحيطي الذي يُعتبر ثاني أعمق نقطة في المحيطات بعد خندق ماريانا؟', 'خندق تونغا (10,882 مترًا)', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الجزيرة الوحيدة في العالم التي تقسم بين ثلاث دول؟', 'جزيرة بورنيو (إندونيسيا، ماليزيا، بروناي)', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تمتلك أطول ساحل على المحيط الهادئ؟', 'كندا (243,000 كيلومتر بسبب الجزر)', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو أعلى جبل في العالم إذا قيس من قاعدته تحت مستوى سطح البحر إلى قمته؟', 'جبل ماونا كيا في هاواي (10,205 أمتار من القاعدة)', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي لا تملك عاصمة رسمية محددة؟', 'ناورو', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تحتوي على أكبر حقل جليدي خارج القطبين؟', 'آيسلندا (حقل فاتناجوكل)', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو النهر الذي يشكل أكبر شلال في العالم من حيث حجم المياه؟', 'نهر الكونغو (شلال ليفينغستون)', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تقع فيها أعلى مدينة في العالم على ارتفاع 5,100 متر؟', 'بوليفيا (مدينة لا رينكونادا)', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو المضيق الذي يفصل بين سيبيريا وألاسكا؟', 'مضيق بيرينغ', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تمتلك أكبر عدد من الجزر المرجانية في العالم؟', 'إندونيسيا (جزء من مثلث المرجان)', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو أكبر حوض تصريف مائي في العالم؟', 'حوض نهر الأمازون', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الجزيرة التي تُعتبر أكبر جزيرة رملية في العالم؟', 'جزيرة فريزر في أستراليا', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي الدولة التي تقع فيها أكبر صحراء ملحية في العالم؟', 'بوليفيا (سالار دي أويوني)', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو الجبل الذي يُعتبر أبعد نقطة عن مركز الأرض بسبب انتفاخ خط الاستواء؟', 'جبل تشيمبورازو في الإكوادور', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي أطول سلسلة جبال تحت الماء؟', 'ميد-أتلانتيك ريدج، 65,000 كم', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هو أعمق كهف طبيعي معروف في العالم؟', 'كهف كروبيرا (Krubera)، 2,197 متر', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما هي أكبر صحراء في العالم من حيث المساحة؟', 'الصحراء القطبية الجنوبية، 14 مليون كم²', 600
FROM categories WHERE name = 'جغرافيا'
UNION ALL
SELECT categories.id, 'ما اسم المدينة التي تُعرف باسم "المدينة الوردية"؟', 'البتراء (في الأردن)', 600
FROM categories WHERE name = 'جغرافيا';
