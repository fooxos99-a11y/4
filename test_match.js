const fs = require('fs');
let content = fs.readFileSync('components/header.tsx', 'utf-8');

let m = content.match(/<button [^>]*isStudentsMenuOpen([^>]*)>([\s\S]*?)<\/button>/);
console.log(m ? m[2] : 'NO MATCH');
