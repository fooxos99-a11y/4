const fs = require('fs');
let c = fs.readFileSync('app/profile/page.tsx', 'utf8');

c = c.replace('grid-cols-4', 'grid-cols-5');

c = c.replace(
  '{ value: "plan",         icon: <BookMarked className="w-5 h-5" />, label: "الخطة"      },',
  '{ value: "plan",         icon: <BookMarked className="w-5 h-5" />, label: "الخطة"      },\n                    { value: "archive",      icon: <Library className="w-5 h-5" />, label: "المحفوظ"    },'
);

fs.writeFileSync('app/profile/page.tsx', c);
console.log("Tab added.");
