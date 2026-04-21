-- Update admin account name from مالك السواجي to عبدالرحمن
UPDATE users 
SET name = 'عبدالرحمن' 
WHERE account_number = 11 AND role = 'admin';
