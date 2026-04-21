const fs = require('fs');
let code = fs.readFileSync('components/header.tsx', 'utf-8');

code = code.replace(
  '                     width: "42px",\r\n                     height: "42px",',
  '                     width: "48px",\r\n                     height: "42px",'
);
code = code.replace(
  '                     width: "42px",\n                     height: "42px",',
  '                     width: "48px",\n                     height: "42px",'
);

fs.writeFileSync('components/header.tsx', code);
console.log('Update complete.');