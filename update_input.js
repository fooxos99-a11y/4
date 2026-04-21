const fs = require('fs');
let code = fs.readFileSync('components/ui/input.tsx', 'utf8');

code = code.replace(
  /'focus-visible:border-ring focus-visible:ring-ring\/50 focus-visible:ring-\[3px\]'/,
  "'focus-visible:border-[#D4AF37] focus-visible:ring-[#D4AF37]/30 focus-visible:ring-[3px]'"
).replace(
  /rounded-md border bg-transparent px-3 py-1/,
  "rounded-xl border border-neutral-200 bg-white px-4 py-2"
).replace(
  /h-9/,
  "h-10"
); // change default height slightly larger and rounded.

fs.writeFileSync('components/ui/input.tsx', code);
console.log('Updated input.tsx');
