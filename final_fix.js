const fs = require('fs'); let c = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf-8'); 
const p2 = c.indexOf('{/* ????? ???????? */}'); 
const p1end = c.indexOf('</div>', c.indexOf('</Select>', p2)); 
const p2 = c.indexOf('{/* ????? ???????? */}'); 
console.log(p1, p2); 
