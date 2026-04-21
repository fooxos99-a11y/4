const fs = require('fs');

let filePath = 'app/admin/dashboard/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Fix the main statistics cards (top cards)
code = code.replace(/bg-white rounded-2xl border border-\[#D4AF37\]\/40 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md/g, 'bg-white rounded-3xl border border-neutral-100 p-6 flex flex-col gap-4 shadow-md hover:shadow-lg');

// Adjust the icon box in top cards to be cleaner
code = code.replace(/w-11 h-11 rounded-xl bg-\[#D4AF37\]\/8 border border-\[#D4AF37\]\/40/g, 'w-12 h-12 rounded-2xl bg-neutral-50 border border-neutral-100');
code = code.replace(/text-\[#D4AF37\]/g, 'text-slate-700'); // make the icons slate, we'll restore specific gold ones if needed
code = code.replace(/text-slate-700 font-bold/g, 'text-[#D4AF37] font-bold'); // Make important texts stand out
code = code.replace(/text-3xl/g, 'text-3xl text-slate-800'); 
code = code.replace(/text-sm text-neutral-500 font-medium/g, 'text-sm text-neutral-500 font-semibold');

// Fix hover states on action buttons
code = code.replace(/hover:bg-\[#D4AF37\]\/5/g, 'hover:bg-neutral-50');

// Fix border colors inside action list items
code = code.replace(/border-b border-\[#D4AF37\]\/20/g, 'border-b border-neutral-100');

fs.writeFileSync(filePath, code);
console.log('Fixed dashboard layout.');
