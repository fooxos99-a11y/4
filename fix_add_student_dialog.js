const fs = require('fs');

let filePath = 'components/global-add-student-dialog.tsx';
let code = fs.readFileSync(filePath, 'utf8');

// Change the footer container to remove flex-col or flex-1 logic and make buttons small/align to end
code = code.replace(/<div className="px-6 py-4 border-t border-\[#D4AF37\]\/25 flex gap-3">/g, 
  '<div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-2 pt-4">');

// Update Save Button
code = code.replace(/className="flex-1 h-10 rounded-lg disabled:opacity-50 bg-\[#D4AF37\] hover:bg-\[#C9A961\] text-white font-bold transition-all shadow-sm border-none"/g, 
  'className="text-sm h-9 px-6 rounded-lg bg-[#D4AF37] hover:bg-[#C9A961] text-white font-bold transition-all shadow-sm border-none"');

// Update Cancel Button
code = code.replace(/className="border-\[#D4AF37\]\/40 text-neutral-600 rounded-xl h-10"/g, 
  'className="text-sm h-9 px-6 rounded-lg border-neutral-200 text-neutral-600 hover:bg-neutral-50"');

fs.writeFileSync(filePath, code);
console.log('Fixed buttons in global-add-student-dialog.');
