const fs = require('fs');
let code = fs.readFileSync('components/hero-section.tsx', 'utf-8');

code = code.replace(
  '<div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d8a355] to-transparent opacity-50" />',
  ''
);

fs.writeFileSync('components/hero-section.tsx', code);
console.log('Done');