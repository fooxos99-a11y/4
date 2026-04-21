const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

// 1. Remove the box around submenu items
content = content.replace(/className="flex flex-col border border-\\[#d8a355\\]\\/30 rounded-xl mt-2 mx-2 overflow-hidden bg-white"/g, 'className="flex flex-col mx-2 px-2"');

// 2. Fix the button layout from \TEXT <Icon...>\ to \<Icon...> TEXT\ and replace justify-between with justify-start gap-3
// Pattern: <button ...>Some Arabic <Icon /></button>
// Example: <button onClick={() => handleNav("/admin/dashboard?action=add-student")} className="text-right py-3 px-4 border-b border-slate-100 last:border-none active:bg-[#f5f1e8] hover:bg-[#f5f1e8]/50 cursor-pointer transition-all text-[14.5px] flex items-center justify-between text-[#00312e]">????? ???? <UserPlus size={16} className="text-[#d8a355]" /></button>
// Notice some have nested elements but most are simple text and icon.

// Regex to capture: <button onClick... className="... flex items-center justify-between ...">TEXT <Icon... /></button>
content = content.replace(
  /(<button[^>]*className="[^"]*?\bflex items-center justify-between\b[^"]*?"[^>]*>)([^<]+)\s*(<[A-Z][A-Za-z0-9]+[^>]*\/>)(.*?<\/button>)/g,
  (match, startTag, textContent, icon, endTag) => {
    // replace justify-between with justify-start gap-3
    let newStartTag = startTag.replace('justify-between', 'justify-start gap-3');
    // For games dropdown or something similar that uses a slightly different structure, textContent might just be arabic
    return newStartTag + icon + ' <span>' + textContent.trim() + '</span>' + endTag;
  }
);

fs.writeFileSync('components/header.tsx', content);
console.log('Script done');
