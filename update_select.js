const fs = require('fs');
let code = fs.readFileSync('components/ui/select.tsx', 'utf8');

code = code.replace(
  /focus-visible:border-ring focus-visible:ring-ring\/50/g,
  "focus-visible:border-[#D4AF37] focus-visible:ring-[#D4AF37]/30"
).replace(
  /gap-2 rounded-md border bg-transparent px-3 py-2/g,
  "gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2"
).replace(
  /data-\[size=default\]:h-9/g,
  "data-[size=default]:h-10"
).replace(
  /rounded-md border shadow-md/g,
  "rounded-xl border border-neutral-100 shadow-lg bg-white"
);

fs.writeFileSync('components/ui/select.tsx', code);
console.log('Updated select.tsx');
