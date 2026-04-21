const fs = require('fs');
let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf8');

code = code.replace(/\{ value: "0\.3333", label: "ثلث وجه \(5 أسطر\)" \},\s*/g, '');
code = code.replace(/if \(v <= 0\.334 && v >= 0\.332\) return "ثلث وجه";\s*/g, '');

fs.writeFileSync('app/admin/student-plans/page.tsx', code);
console.log('Removed 0.333');