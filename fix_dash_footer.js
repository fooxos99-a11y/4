const fs = require('fs');
let code = fs.readFileSync('app/admin/dashboard/page.tsx', 'utf8');

code = code.replace(/className=\"px-6 py-4 bg-neutral-50 border-t border-\[#D4AF37\]\/25 flex gap-3\"/g, 'className=\"px-6 py-4 bg-neutral-50 shadow-sm border-t border-[#D4AF37]/25 flex justify-end gap-2 pt-2\"');

fs.writeFileSync('app/admin/dashboard/page.tsx', code, 'utf8');
