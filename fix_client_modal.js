const fs = require('fs');
let code = fs.readFileSync('components/global-admin-modals.tsx', 'utf8');
code = code.replace(/"use client"/g, '');
code = code.replace(/'use client'/g, '');
code = '"use client";\n' + code;
fs.writeFileSync('components/global-admin-modals.tsx', code);