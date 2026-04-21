-- حذف الطالب رقم 11 الذي يتعارض مع رقم حساب الإداري
DELETE FROM students 
WHERE account_number = 11 AND name = '11';
