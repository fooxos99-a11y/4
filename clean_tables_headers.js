const fs = require('fs');

function cleanFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf8');

  // Fix golden borders in page headers and sections
  code = code.replace(/border-b border-\[#D4AF37\]\/40/g, 'border-b border-neutral-100');
  code = code.replace(/border-b border-\[#D4AF37\]\/30/g, 'border-b border-neutral-100');
  code = code.replace(/border-b border-\[#d8a355\]\/20/g, 'border-b border-neutral-100');
  code = code.replace(/border-b border-\[#d8a355\]\/10/g, 'border-b border-neutral-100');

  // Fix layout and background elements in attendance specifically
  code = code.replace(/border border-\[#d8a355\]\/25 shadow-sm/g, 'border border-neutral-100 shadow-md');
  code = code.replace(/border-\[#d8a355\]\/40/g, 'border-neutral-200');
  code = code.replace(/focus-visible:ring-\[#d8a355\]\/40/g, 'focus-visible:ring-[#D4AF37]/30');
  code = code.replace(/focus:ring-\[#d8a355\]\/40/g, 'focus:ring-[#D4AF37]/30');
  code = code.replace(/overflow-x-auto rounded-lg border border-\[#d8a355\]\/15/g, 'overflow-x-auto rounded-xl border border-neutral-100 bg-white');

  code = code.replace(/bg-\[#f5f1e8\]\/60/g, 'bg-neutral-50/80');
  code = code.replace(/hover:bg-\[#f5f1e8\]\/60/g, 'hover:bg-neutral-50/80');
  code = code.replace(/hover:bg-\[#f5f1e8\]\/50/g, 'hover:bg-neutral-50');

  code = code.replace(/bg-white rounded-2xl border border-\[#D4AF37\]\/40 shadow-sm/g, 'bg-white rounded-2xl border border-neutral-100 shadow-md');

  // Table header standard
  code = code.replace(/text-right text-\[#1a2332\] font-bold text-base/g, 'text-right text-slate-600 font-bold text-sm');

  fs.writeFileSync(filePath, code);
  console.log('Cleaned ' + filePath);
}

['app/admin/student-daily-attendance/page.tsx', 'app/admin/student-plans/page.tsx', 'app/admin/circles/page.tsx'].forEach(cleanFile);
