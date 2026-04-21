const fs = require('fs');
let c = fs.readFileSync('components/header.tsx', 'utf8');

c = c.replace('path: "/admin/dashboard?action=add-student",', 'path: "?action=add-student",');

fs.writeFileSync('components/header.tsx', c);
console.log('Fixed link.');
