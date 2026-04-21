const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) walkDir(dirPath, callback);
    else callback(path.join(dir, f));
  });
}

const folders = ['./app/teacher', './app/student', './app/profile', './components/admin-modals'];

folders.forEach(folder => {
  walkDir(folder, function(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

    let code = fs.readFileSync(filePath, 'utf8');
    let originalCode = code;

    // Background & containers
    code = code.replace(/bg-\[#fafaf9\]/g, 'bg-[#f8f9fa]');
    code = code.replace(/border border-\[#D4AF37\]\/40 rounded-xl bg-white shadow-sm/g, 'border border-neutral-100 rounded-2xl bg-white shadow-md');
    code = code.replace(/border border-\[#D4AF37\]\/20 rounded-xl bg-white shadow-sm/g, 'border border-neutral-100 rounded-2xl bg-white shadow-md');
    code = code.replace(/rounded-xl bg-white border border-\[#D4AF37\]\/20/g, 'rounded-2xl border border-neutral-100 bg-white shadow-md');
    
    // Admin header lines
    code = code.replace(/border-b border-\[#D4AF37\]\/40/g, 'border-b border-neutral-100');
    code = code.replace(/border-b border-\[#D4AF37\]\/30/g, 'border-b border-neutral-100');
    
    // Text titles
    code = code.replace(/text-\[#1a2332\]/g, 'text-slate-800');

    // Back buttons
    code = code.replace(/w-9 h-9 rounded-lg border border-\[#D4AF37\]\/40 flex items-center justify-center text-\[#C9A961\] hover:bg-\[#D4AF37\]\/10/g, 'w-9 h-9 rounded-xl border border-neutral-200 flex items-center justify-center text-slate-500 hover:bg-neutral-50 hover:text-slate-700 bg-white');

    if (code !== originalCode) {
      fs.writeFileSync(filePath, code);
      console.log('Cleaned ' + filePath);
    }
  });
});
