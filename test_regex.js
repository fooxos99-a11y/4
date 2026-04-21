const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

let m = content.match(/(<button[^>]*className="[^"]*?\bflex items-center justify-between\b[^"]*?"[^>]*>)\s*([^<]*[^\s<])\s*(<[A-Z][A-Za-z0-9]+[^>]*\/>)(.*?<\/button>)/);
if (m) console.log("MATCHED", m[2], m[3]);
else console.log("NO MATCH");

// let me just completely rewrite the regex to be safer for all buttons with specific structure
// Find: className="... justify-between ..." ... >TEXT <Icon ... /></button>
let replaced = content.replace(/(className="[^"]*?)justify-between([^"]*?"[^>]*>)\s*([^\n<]+)\s*(<[A-Z][a-zA-Z0-9]+[^>]*\/>)/g, '$1justify-start gap-4$2$4 <span>$3</span>');

let count = (replaced.match(/justify-start gap-4/g) || []).length;
console.log('Replacements made: ', count);

fs.writeFileSync('components/header.tsx', replaced);
