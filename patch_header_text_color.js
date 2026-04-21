const fs = require('fs');

let code = fs.readFileSync('components/header.tsx', 'utf-8');

code = code.replace(/color: "#0a4545"/g, 'color: "#D4AF37"');

fs.writeFileSync('components/header.tsx', code);
console.log('Level number text color patched to gold');
