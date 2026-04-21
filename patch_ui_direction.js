const fs = require('fs');
let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf8');

const toggleStartIdx = code.indexOf('{/* اتجاه الخطة */}');
const nextBlockIdx = code.indexOf('{/* الحفظ السابق وطريقة المراجعة والربط */}');

if (toggleStartIdx !== -1 && nextBlockIdx !== -1) {
  code = code.slice(0, toggleStartIdx) + code.slice(nextBlockIdx);
}

code = code.replace(/setDirection\("asc"\);\s*/g, '');
code = code.replace(/setDirection\("desc"\);\s*/g, '');

fs.writeFileSync('app/admin/student-plans/page.tsx', code);
console.log('UI Direction removed');