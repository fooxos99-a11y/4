const fs = require('fs');
let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf8');

code = code.replace(
  '{ value: "0.3333", label: "ثلث وجه (5 أسطر)" },',
  '{ value: "0.25", label: "ربع وجه (حوالي 4 أسطر)" },\n  { value: "0.3333", label: "ثلث وجه (5 أسطر)" },'
);

code = code.replace(
  'if (v <= 0.334 && v >= 0.332) return "ثلث وجه";',
  'if (v === 0.25) return "ربع وجه";\n  if (v <= 0.334 && v >= 0.332) return "ثلث وجه";'
);

fs.writeFileSync('app/admin/student-plans/page.tsx', code);
console.log('UI Options patched.');