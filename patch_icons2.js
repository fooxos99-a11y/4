const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

// 1. Remove the box around submenu items
content = content.replace(/className="flex flex-col border border-\[#d8a355\]\/30 rounded-xl mt-2 mx-2 overflow-hidden bg-white"/g, 'className="flex flex-col pt-1"');

// 2. Fix the button layout from \`TEXT <Icon...>\` to \`<Icon...> TEXT\` and replace justify-between with justify-start gap-3
content = content.replace(
  /(<button[^>]*className="[^"]*?\bflex items-center justify-between\b[^"]*?"[^>]*>)([^<]+)\s*(<[A-Z][A-Za-z0-9]+[^>]*\/>)(.*?<\/button>)/g,
  (match, startTag, textContent, icon, endTag) => {
    let newStartTag = startTag.replace('justify-between', 'justify-start gap-4');
    return newStartTag + icon + ' <span>' + textContent.trim() + '</span>' + endTag;
  }
);

fs.writeFileSync('components/header.tsx', content);
console.log('Script done');
