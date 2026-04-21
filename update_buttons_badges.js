const fs = require('fs');

// Update button.tsx
let btn = fs.readFileSync('components/ui/button.tsx', 'utf8');
btn = btn.replace(
  /rounded-md/g,
  "rounded-xl"
).replace(
  /focus-visible:border-ring focus-visible:ring-ring\/50/g,
  "focus-visible:border-[#D4AF37] focus-visible:ring-[#D4AF37]/30"
);
fs.writeFileSync('components/ui/button.tsx', btn);
console.log('Updated button.tsx');

// Update badge.tsx
let badge = fs.readFileSync('components/ui/badge.tsx', 'utf8');
badge = badge.replace(
  /rounded-md/g,
  "rounded-full"
).replace(
  /focus-visible:border-ring focus-visible:ring-ring\/50/g,
  "focus-visible:border-[#D4AF37] focus-visible:ring-[#D4AF37]/30"
);
fs.writeFileSync('components/ui/badge.tsx', badge);
console.log('Updated badge.tsx');
