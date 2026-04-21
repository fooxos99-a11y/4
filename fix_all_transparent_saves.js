const fs = require('fs');
const path = require('path');

function walkDir(dir) {
  let entries = fs.readdirSync(dir);
  entries.forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath);
    } else if(dirPath.endsWith('.tsx')) {
      let originalCode = fs.readFileSync(dirPath, 'utf8');
      
      // Look for the specific transparent gold classes and replace them with solid gold classes
      // We will look for anything containing bg-[#D4AF37]/10 combined with text-[#C9A961]
      // Or border-[#D4AF37]/... etc. used for "submit" buttons.

      let code = originalCode.replace(/className="([^"]*)bg-\[#D4AF37\]\/10(\s+[^"]*)?text-\[#C9A961\]([^"]*)"/g, (match, before, space, after) => {
        // Only replace if it implies it's an action button inside a footer or form (has h-10 or similar)
        // Let's just blindly replace the background and text color to solid in these specific instances.
        let newClasses = Array.from(new Set([
          ...before.split(' '), 
          ...(space||'').split(' '), 
          ...after.split(' ')
        ])).filter(c => c && !c.includes('bg-[') && !c.includes('text-[') && !c.includes('border-[') && !c.includes('hover:bg-[') && !c.includes('border') && !c.includes('font-') && !c.includes('transition-'));
        
        let custom = 'bg-[#D4AF37] hover:bg-[#C9A961] text-white font-bold transition-all shadow-sm border-none ';
        if (!newClasses.some(c => c.includes('rounded-'))) custom += 'rounded-xl ';
        
        return `className="${(newClasses.join(' ') + ' ' + custom).trim()}"`;
      });

      // Special case for global-add-student-dialog.tsx explicit matching to be safe
      code = code.replace(/className="flex-1 h-10 rounded-lg border border-\[#D4AF37\]\/30 bg-\[#D4AF37\]\/10 text-\[#C9A961\] font-medium transition-colors hover:bg-\[#D4AF37\]\/20 disabled:opacity-50"/g, 
        'className="flex-1 h-10 rounded-xl bg-[#D4AF37] text-white font-bold transition-all hover:bg-[#C9A961] shadow-sm disabled:opacity-50"'
      );

      // We might have similar transparent designs in other modals. Let's do a broad replace of this specific transparent string
      code = code.replace(/className="([^"]*)border border-\[#D4AF37\]\/[0-9]+ bg-\[#D4AF37\]\/10 text-\[#C9A961\]([^"]*)"/g, 
        'className="$1 bg-[#D4AF37] hover:bg-[#C9A961] text-white border-0 shadow-sm font-bold $2"'
      );

      // What if hover is explicitly there?
      code = code.replace(/className="([^"]*)bg-\[#D4AF37\]\/10 hover:bg-\[#D4AF37\]\/20 text-\[#C9A961\] hover:text-\[#D4AF37\]([^"]*)"/g, 
        'className="$1 bg-[#D4AF37] hover:bg-[#C9A961] text-white shadow-sm font-bold $2"'
      );
      
      // Let's do a more robust regex just for flex-1 h-10 buttons returning to our pattern.
      code = code.replace(/className="flex-1 h-10 rounded-[^ ]* border border-\[#D4AF37\]\/[0-9]+ bg-\[#D4AF37\]\/10 text-\[#C9A961\] font-[^ ]* transition-[^ ]* hover:bg-\[#D4AF37\]\/[0-9]+ disabled:opacity-[0-9]+"/g, 
        'className="flex-1 h-10 rounded-xl bg-[#D4AF37] hover:bg-[#C9A961] text-white font-bold transition-all shadow-sm disabled:opacity-50 border-0"'
      );

      // Clean up duplicates we might have made
      code = code.replace(/border-0 border-0/g, 'border-0');
      code = code.replace(/bg-\[#D4AF37\] bg-\[#D4AF37\]/g, 'bg-[#D4AF37]');

      if (code !== originalCode) {
         console.log('Updated classes in:', dirPath);
         fs.writeFileSync(dirPath, code);
      }
    }
  });
}

walkDir('./components');
walkDir('./app');
