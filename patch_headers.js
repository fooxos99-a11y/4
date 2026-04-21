const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

// The headers have: flex items-center justify-between font-extrabold text-[#00312e] text-[17px]
// Example string:
// <button onClick={() => setIsStudentsMenuOpen(!isStudentsMenuOpen)} className="w-full text-right py-3 px-4 rounded-lg active:bg-[#f5f1e8] hover:bg-[#f5f1e8]/50 cursor-pointer active:scale-95 transition-all flex items-center justify-between font-extrabold text-[#00312e] text-[17px]">
//   الطلاب {isStudentsMenuOpen ? <ChevronDown size={18} className="text-[#d8a355]" /> : <ChevronLeft size={18} className="text-[#d8a355]" />}
// </button>

// Replace justify-between with justify-start gap-4
content = content.replace(/(className="[^"]*?)justify-between([^"]*?font-extrabold[^"]*?")\s*>\s*([^\s\{]+)\s*(\{is[A-Za-z]+MenuOpen \? <ChevronDown[^>]+> : <Chevron[A-Za-z]+[^>]+>\})/g, '$1justify-start gap-4$2>\n  $4 <span>$3</span>');

// Also games admin menu:
// <button onClick={() => setIsGamesMenuOpen(!isGamesMenuOpen)} className="w-full text-right py-3 px-4 active:bg-[#f5f1e8] hover:bg-[#f5f1e8]/50 cursor-pointer transition-all text-[14.5px] flex items-center justify-between text-[#00312e]">
//   إدارة الألعاب
//   <div className="flex items-center gap-2">
//     {isGamesMenuOpen ? <ChevronDown size={14} className="text-[#d8a355]" /> : <ChevronLeft size={16} className="text-[#d8a355]" />}
//   </div>
// </button>
content = content.replace(/(className="[^"]*?)justify-between([^"]*?GamesMenuOpen[^"]*?")\s*>\s*([^\n]+)\n\s*<div[^>]+>\s*(\{isGamesMenuOpen \? <ChevronDown[^>]+> : <Chevron[A-Za-z]+[^>]+>\})\s*<\/div>/g, 
'$1justify-start gap-4$2>\n  $4 <span>$3</span>');

fs.writeFileSync('components/header.tsx', content);
console.log('Done headers');
