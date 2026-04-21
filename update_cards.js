const fs = require('fs');

// Update textarea.tsx
let codeTextarea = fs.readFileSync('components/ui/textarea.tsx', 'utf8');
codeTextarea = codeTextarea.replace(
  /focus-visible:border-ring focus-visible:ring-ring\/50/g,
  "focus-visible:border-[#D4AF37] focus-visible:ring-[#D4AF37]/30"
).replace(
  /rounded-md border bg-transparent px-3 py-2/g,
  "rounded-xl border border-neutral-200 bg-white px-4 py-3"
);
fs.writeFileSync('components/ui/textarea.tsx', codeTextarea);

// Update card.tsx
let codeCard = fs.readFileSync('components/ui/card.tsx', 'utf8');
codeCard = codeCard.replace(
  /'bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm'/g,
  "'bg-card text-card-foreground flex flex-col gap-6 rounded-2xl border border-neutral-100 shadow-md py-6'"
).replace(
  /className={cn\('leading-none font-semibold', className\)}/g,
  "className={cn('leading-none font-bold text-lg text-slate-800', className)}"
);
fs.writeFileSync('components/ui/card.tsx', codeCard);

console.log('Updated Cards and Textareas');
