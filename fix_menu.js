const fs = require('fs');

let content = fs.readFileSync('components/header.tsx', 'utf-8');

// 1. Remove boxes
content = content.replace(/className="flex flex-col border border-\[#d8a355\]\/30 rounded-xl mt-2 mx-2 overflow-hidden bg-white"/g, 'className="flex flex-col pt-1"');

// 2. Simple Submenu Items
// Before: <button onClick={...} className="... flex items-center justify-between ...">TEXT <Icon ... /></button>
// After: <button onClick={...} className="... flex items-center justify-start gap-4 ..."><Icon ... /> <span>TEXT</span></button>
content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?"[^>]*>)\s*([^\n<]+)\s*(<[A-Z][a-zA-Z0-9]+[^>]*\/>)/g, '$1justify-start gap-4$2$4 <span>$3</span>');

// 3. Complex headers like: 
// <button ... className="... flex items-center justify-between font-extrabold text-[#00312e] text-[17px]">
//   الطلاب {isStudentsMenuOpen ? <ChevronDown size={18} className="text-[#d8a355]" /> : <ChevronLeft size={18} className="text-[#d8a355]" />}
// </button>
content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?font-extrabold[^"]*?">)\s*([^\s\{<]+)\s*(\{is[a-zA-Z]+MenuOpen[^}]+})/g, '$1justify-start gap-4$2\n$4 <span>$3</span>');

// 4. Specifically the Games menu header:
// <button onClick={() => setIsGamesMenuOpen(!isGamesMenuOpen)} className="... flex items-center justify-between text-[#00312e]">
//   إدارة الألعاب
//   <div className="flex items-center gap-2">
//     {isGamesMenuOpen ? <ChevronDown size={14} className="text-[#d8a355]" /> : <ChevronLeft size={16} className="text-[#d8a355]" />}
//   </div>
// </button>
content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?GamesMenuOpen[^"]*?">)\s*([^\s<]+)\s*<div[^>]*>\s*(\{isGamesMenuOpen[^}]+})\s*<\/div>/g, '$1justify-start gap-4$2\n$4 <span>$3</span>');

// Also update the Home/Achievements links that don't have icons but have justify-between
content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?text-sm font-bold[^"]*?">)\s*([^\n<]+)/g, '$1justify-start gap-4$2<span>$3</span>');

content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?hover:text-\[#d8a355\][^"]*?">)\s*([^\n<]+)/g, '$1justify-start gap-4$2<span>$3</span>');

// Specifically update the "لوحة التحكم الرئيسية", "الإنجازات", "التحديات" etc inside border-r-2
content = content.replace(/(className="[^"]*?\b)justify-between(\b[^"]*?text-\[14\.5px\][^"]*?">)\s*([^<]+)\s*(<[A-Za-z0-9]+[^>]*\/>)/g, '$1justify-start gap-4$2$4 <span>$3</span>');

fs.writeFileSync('components/header.tsx', content);

console.log("Success");
