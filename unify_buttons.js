const fs = require('fs');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { results = results.concat(walk(file)); } 
        else { if (file.endsWith('.tsx')) { results.push(file); } }
    });
    return results;
}

const files = walk('components/admin-modals').concat(['app/admin/dashboard/page.tsx', 'components/shared-modals.tsx']);

let replaced = 0;

for (let file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // We want to target DialogFooters. 
    // They usually look like:
    // <div className="flex justify-end gap-2 pt-2"> ... </Button> ... </Button> </div>
    // Let's just string forcefully the buttons inside <DialogFooter> or <div className="flex justify-end ...">
    // Actually, simply regexing ANY save/add/cancel button inside the files might break things.
    // Let's find:
    // 1) Cancel buttons: Usually have onClick={...close...} and variant="outline"
    // 2) Action buttons: Have bg-[#D4AF37] text-white
    
    // Instead of complex parsing, I'll just forcefully apply the classes to ALL Buttons that are meant for submit/cancel.
    
    // Cancel buttons:
    content = content.replace(/<Button\s+variant=\"outline\"([^\>]*?)>إلغاء<\/Button>/g, '<Button variant="outline"$1 className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600 px-4">إلغاء</Button>');
    content = content.replace(/className=\"[^\"]*\"\s*>إلغاء<\/Button>/g, 'className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600 px-4">إلغاء</Button>');
    
    // Submit buttons (which could have various words like حفظ, إضافة, نقل, حذف, تحديث) 
    // We match `<Button ... className={...}>كلمة</Button>` where word is one of action words.
    const actionWords = ['حفظ', 'إضافة', 'نقل', 'حذف', 'تحديث', 'إنهاء الفصل', 'متابعة'];
    
    for (let word of actionWords) {
        // If it's the action button, we want that solid gold small look.
        // It might have `disabled={...}` or `onClick={...}` before or after className.
        // Easiest is to regex replace className="..." with our standard one if it precedes the word.
        
        // This regex looks for `<Button ... >word</Button>` and replaces its className.
        // We will just do a simpler search and replace for anything that has `bg-[#D4AF37]` and `text-white` to the new class!
    }

    // Let's just standardize ALL solid gold buttons to the exact same padding/rounded/shadow!
    content = content.replace(/className=\"([^\"]*?)bg-\[#D4AF37\]([^\"]*?)text-white([^\"]*?)\"/g, 'className=\"text-sm h-9 rounded-lg bg-[#D4AF37] hover:bg-[#C9A961] text-white font-bold transition-all shadow-sm border border-transparent px-4\"');
    content = content.replace(/className=\"([^\"]*?)text-white([^\"]*?)bg-\[#D4AF37\]([^\"]*?)\"/g, 'className=\"text-sm h-9 rounded-lg bg-[#D4AF37] hover:bg-[#C9A961] text-white font-bold transition-all shadow-sm border border-transparent px-4\"');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        replaced++;
    }
}
console.log('Fixed dialog buttons in ' + replaced + ' files.');
