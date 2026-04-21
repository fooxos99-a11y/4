const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) walkDir(dirPath, callback);
    else callback(path.join(dir, f));
  });
}

walkDir('./app/admin', function(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let code = fs.readFileSync(filePath, 'utf8');
  let originalCode = code;

  // Fix golden borders in page headers and sections
  code = code.replace(/border-b border-\[#D4AF37\]\/40/g, 'border-b border-neutral-100');
  code = code.replace(/border-b border-\[#D4AF37\]\/30/g, 'border-b border-neutral-100');
  code = code.replace(/border-b border-\[#d8a355\]\/20/g, 'border-b border-neutral-100');
  code = code.replace(/border-b border-\[#d8a355\]\/10/g, 'border-b border-neutral-100');

  // Fix layout and background elements
  code = code.replace(/border border-\[#d8a355\]\/25 shadow-sm/g, 'border border-neutral-100 shadow-md rounded-2xl');
  code = code.replace(/border-\[#d8a355\]\/40/g, 'border-neutral-200');
  code = code.replace(/focus-visible:ring-\[#d8a355\]\/40/g, 'focus-visible:ring-[#D4AF37]/30');
  code = code.replace(/focus:ring-\[#d8a355\]\/40/g, 'focus:ring-[#D4AF37]/30');
  code = code.replace(/overflow-x-auto rounded-lg border border-\[#d8a355\]\/15/g, 'overflow-x-auto rounded-xl border border-neutral-100 bg-white');

  code = code.replace(/bg-\[#f5f1e8\]\/60/g, 'bg-neutral-50/80');
  code = code.replace(/hover:bg-\[#f5f1e8\]\/60/g, 'hover:bg-neutral-50/80');
  code = code.replace(/hover:bg-\[#f5f1e8\]\/50/g, 'hover:bg-neutral-50');

  code = code.replace(/bg-white rounded-2xl border border-\[#D4AF37\]\/40 shadow-sm/g, 'bg-white rounded-2xl border border-neutral-100 shadow-md');

  // Title text standardizing from #1a2332 -> slate-800 to be softer
  code = code.replace(/text-\[#1a2332\]/g, 'text-slate-800');

  // Back button unification
  code = code.replace(/w-9 h-9 rounded-lg border border-\[#D4AF37\]\/40 flex items-center justify-center text-\[#C9A961\] hover:bg-\[#D4AF37\]\/10/g, 'w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-slate-500 hover:bg-neutral-50 hover:text-slate-700 bg-white');

  if (code !== originalCode) {
    fs.writeFileSync(filePath, code);
    console.log('Cleaned ' + filePath);
  }
});
