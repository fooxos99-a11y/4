const fs = require('fs');
let code = fs.readFileSync('app/teacher/halaqah/[id]/page.tsx', 'utf8');

code = code.replace(
  /<Button[^>]*onClick={\(\) => openCompDialog\(student\.id\)}[^>]*>[\s\S]*?<\/Button>/g,
  `<Button
      variant="outline"
      onClick={() => openCompDialog(student.id)}
      title="تعويض الحفظ"
      className="h-8 px-3 rounded-md bg-emerald-100 border-emerald-500 text-emerald-800 transition-all hover:bg-emerald-200 flex items-center font-bold text-xs"
  >
      <RotateCcw className="w-4 h-4 ml-1" />
      تعويض
  </Button>`
);

fs.writeFileSync('app/teacher/halaqah/[id]/page.tsx', code);
console.log('Button restyled!');
