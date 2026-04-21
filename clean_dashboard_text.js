const fs = require('fs');

let filePath = 'app/admin/dashboard/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Fix duplicate text-slate-800
code = code.replace(/text-3xl text-slate-800 font-bold text-slate-800/g, 'text-3xl text-slate-800 font-bold');
code = code.replace(/text-3xl text-slate-800 md:text-4xl font-bold text-slate-800/g, 'text-3xl md:text-4xl font-bold text-slate-800');

// Fix remaining golden dividers in lists to neutral
code = code.replace(/divide-\[#D4AF37\]\/25/g, 'divide-neutral-100');
code = code.replace(/divide-\[#D4AF37\]\/40/g, 'divide-neutral-100');

// Fix action item text colors
code = code.replace(/text-\[#1a2332\]/g, 'text-slate-800');
code = code.replace(/text-\[#C9A961\]/g, 'text-slate-400');
code = code.replace(/bg-\[#D4AF37\]\/15 border border-\[#D4AF37\]\/30/g, 'bg-neutral-50 border border-neutral-100');

// Fix "border-[#D4AF37]/40" that might be left for focus inputs inside dialogs
code = code.replace(/border-\[#D4AF37\]\/40/g, 'border-neutral-200');
code = code.replace(/focus:border-\[#D4AF37\]/g, 'focus:border-[#D4AF37] focus:ring-[#D4AF37]/30');

fs.writeFileSync(filePath, code);
console.log('Fixed dashboard text colors.');
