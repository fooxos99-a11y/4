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

walkDir('./app', function(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let code = fs.readFileSync(filePath, 'utf8');
  let originalCode = code;

  // Background and standard spacing
  code = code.replace(/bg-\[#fafaf9\]/g, 'bg-[#f8f9fa]');
  
  // Card styles inside admin pages
  code = code.replace(/border border-\[#D4AF37\]\/40 rounded-xl bg-white shadow-sm/g, 'border border-neutral-100 rounded-2xl bg-white shadow-md');
  code = code.replace(/border border-\[#D4AF37\]\/20 rounded-xl bg-white shadow-sm/g, 'border border-neutral-100 rounded-2xl bg-white shadow-md');
  code = code.replace(/rounded-xl bg-white border border-\[#D4AF37\]\/20/g, 'rounded-2xl border border-neutral-100 bg-white shadow-md');
  code = code.replace(/rounded-xl border border-\[#D4AF37\]\/20/g, 'rounded-2xl border border-neutral-100 shadow-sm');
  code = code.replace(/rounded-xl bg-white shadow-sm border border-\[#D4AF37\]\/10/g, 'rounded-2xl bg-white shadow-md border border-neutral-100');

  // Standardize the headers padding/font
  code = code.replace(/<main className="flex-1 py-10 px-4">/g, '<main className="flex-1 py-10 px-4 md:px-8">');

  if (code !== originalCode) {
    fs.writeFileSync(filePath, code);
    console.log('Updated: ' + filePath);
  }
});
