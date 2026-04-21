const fs = require('fs');
const file = 'app/api/student-attendance/all/route.ts';
let s = fs.readFileSync(file, 'utf8');

s = s.replace('.select("id, name, account_number")', '.select("id, name, account_number, halaqah")');
s = s.replace(/'id, name, account_number'/g, "'id, name, account_number, halaqah'");

const regex = /(account_number:\s*student\.account_number,)/g;
s = s.replace(regex, '$1\n        halaqah: student.halaqah,');

fs.writeFileSync(file, s);
console.log('API fixed');