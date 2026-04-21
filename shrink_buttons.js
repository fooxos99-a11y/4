const fs = require('fs');
const path = require('path');

// We want to turn all these:
// className="bg-[#D4AF37] hover:bg-[#C9A961] text-white rounded-xl px-6 py-2 h-10 font-bold transition-all shadow-sm"
// and Cancel buttons like: 
// className="... border-[#D4AF37]/50 text-neutral-600 ..."
// Into:
// Save: className="text-sm h-9 px-6 rounded-lg bg-[#D4AF37] hover:bg-[#C9A961] text-white font-bold transition-all shadow-sm border-none"
// Cancel: className="text-sm h-9 px-6 rounded-lg border-neutral-200 text-neutral-600 hover:bg-neutral-50"

function walkDir(dir) {
  let entries = fs.readdirSync(dir);
  entries.forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath);
    } else if(dirPath.endsWith('.tsx')) {
      let originalCode = fs.readFileSync(dirPath, 'utf8');
      
      // Fix big save buttons
      let code = originalCode.replace(/className="bg-\[#D4AF37\] hover:bg-\[#C9A961\] text-white rounded-xl px-6 py-2 h-10 font-bold transition-all shadow-sm border-none"/g, 
        'className="text-sm h-9 px-6 rounded-lg bg-[#D4AF37] hover:bg-[#C9A961] text-white font-bold transition-all shadow-sm border-none"'
      ).replace(/className="bg-\[#D4AF37\] hover:bg-\[#C9A961\] text-white rounded-xl px-6 py-2 h-10 font-bold transition-all shadow-sm"/g, 
        'className="text-sm h-9 px-6 rounded-lg bg-[#D4AF37] hover:bg-[#C9A961] text-white font-bold transition-all shadow-sm border-none"'
      );

      // Fix big cancel buttons
      code = code.replace(/className="border-\[#D4AF37\]\/50\s+text-neutral-600"/g, 
        'className="text-sm h-9 px-6 rounded-lg border-neutral-200 text-neutral-600 hover:bg-neutral-50"'
      );
      code = code.replace(/className="border-\[#D4AF37\]\/40 text-neutral-600 rounded-xl h-10 bg-white hover:bg-neutral-50"/g, 
        'className="text-sm h-9 px-6 rounded-lg border-neutral-200 text-neutral-600 hover:bg-neutral-50"'
      );
      code = code.replace(/className="border border-\[#D4AF37\]\/40 text-neutral-600 rounded-xl h-10 px-4 bg-white hover:bg-neutral-50"/g, 
        'className="text-sm h-9 px-6 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50"'
      );
      
      if (code !== originalCode) {
         console.log('Shrunk buttons in:', dirPath);
         fs.writeFileSync(dirPath, code);
      }
    }
  });
}

walkDir('./components');
walkDir('./app');
