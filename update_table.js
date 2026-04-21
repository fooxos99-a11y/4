const fs = require('fs');
let code = fs.readFileSync('components/ui/table.tsx', 'utf8');

// Container style - remove border if it has one or add rounding
// But Table itself just has w-full caption-bottom text-sm
// Let's add better styling to the overall view if possible, or just the components.

// Header style
code = code.replace(/className=\{cn\('\[&_tr\]:border-b', className\)\}/g, "className={cn('[&_tr]:border-b bg-neutral-50/80', className)}");

// Row hover
code = code.replace(
  /'hover:bg-muted\/50 data-\[state=selected\]:bg-muted border-b transition-colors'/,
  "'hover:bg-neutral-50 data-[state=selected]:bg-neutral-100 border-b transition-colors'"
);

// Head style (bolder font, dark text, right aligned for arabic)
code = code.replace(
  /'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap/g,
  "'text-[#1a2332] h-12 px-4 text-right align-middle font-semibold whitespace-nowrap border-b-2 border-neutral-100"
);

// Cell style (taller, proper padding)
code = code.replace(
  /'p-2 align-middle whitespace-nowrap/g,
  "'px-4 py-3 align-middle whitespace-nowrap text-[#404b5a]'"
);

fs.writeFileSync('components/ui/table.tsx', code);
console.log('Updated table.tsx');
