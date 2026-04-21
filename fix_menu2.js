const fs = require('fs');

let content = fs.readFileSync('components/header.tsx', 'utf-8');

// 1. Remove boxes
content = content.replace(/className="flex flex-col border border-\[#d8a355\]\/30 rounded-xl mt-2 mx-2 overflow-hidden bg-white"/g, 'className="flex flex-col pt-1"');

// 3. Complex headers
let pairs = [
  { term: 'الطلاب', varOpen: 'isStudentsMenuOpen' },
  { term: 'أفضل الطلاب / الحلقات', varOpen: 'isCirclesMenuOpen' },
  { term: 'إدارة المستخدمين', varOpen: 'isUsersMenuOpen' },
  { term: 'التقارير', varOpen: 'isReportsMenuOpen' },
  { term: 'الإدارة العامة', varOpen: 'isGeneralAdminMenuOpen' },
  { term: 'إدارة الألعاب', varOpen: 'isGamesMenuOpen' },
  { term: 'لوحة تحكم الإدارة', varOpen: 'isAdminMenuOpen' },
];

for (let p of pairs) {
  // we want to transform:
  // className="... justify-between ..."
  // >
  // Term {varOpen ? <ChevronDown ... /> : <ChevronLeft ... />}
  const regexOld = new RegExp(`justify-between([\\s\\S]*?>)\\s*${p.term}\\s*(\\{${p.varOpen}\\s*\\?[^}]+?\\}\\s*\\})`, 'g');
  // wait we don't need regex, let's just do an exact match using generic pattern since we know exactly how they look.
}

// SIMPLER FIX:
// Since we just want to replace justify-between with justify-start gap-4 for the ENTIRE header...
content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?font-extrabold[^"]*?">)\s*([^\s<\{]+(?: [^\s<\{]+)*)\s*(\{is[A-Za-z]+MenuOpen \? <ChevronDown[^>]+> : <Chevron[A-Za-z]+[^>]+>\})/g, 
  '$1justify-start gap-4$2\n  $4 <span>$3</span>');

// Specifically handle the Games menu (which has a <div> wrapping the chevrons)
content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?GamesMenuOpen[^"]*?">)\s*([^\n<]+\S)\s*<div[^>]*>\s*(\{isGamesMenuOpen \? <ChevronDown[^>]+> : <Chevron[A-Za-z]+[^>]+>\})\s*<\/div>/g, 
  '$1justify-start gap-4$2\n  $4 <span>$3</span>');


// 2. Simple Submenu Items
content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?"[^>]*>)\s*([^\n<]+\S)\s*(<[A-Z][a-zA-Z0-9]+[^>]*\/>)/g, '$1justify-start gap-4$2\n$4 <span>$3</span>');


// 4. Update the Home/Achievements links
content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?text-sm font-bold[^"]*?">)\s*([^\n<]+)/g, '$1justify-start gap-4$2<span>$3</span>');
content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?hover:text-\[#d8a355\][^"]*?">)\s*([^\n<]+)/g, '$1justify-start gap-4$2<span>$3</span>');

fs.writeFileSync('components/header.tsx', content);

console.log("Success");
