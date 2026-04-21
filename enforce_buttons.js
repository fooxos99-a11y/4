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

    // The user wants ALL buttons that say cancel/save to match the Bulk Add ones exactly.
    // That means we remove "flex-1" or "w-full" or "h-10" and replace with strictly specific small button styles.
    
    // 1. Cancel Buttons: Should be Variant "outline"
    // Match: <Button variant="outline" ... > إلغاء أو إغلاق </Button>
    content = content.replace(/<Button([^>]*?)variant=[\"']outline[\"']([^>]*?)>(إلغاء|إغلاق)<\/Button>/g, function(match, p1, p2, text) {
        // Strip out existing className
        let newP1 = p1.replace(/className=\"[^\"]*\"/g, '');
        let newP2 = p2.replace(/className=\"[^\"]*\"/g, '');
        return `<Button variant="outline" className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600 px-4"${newP1}${newP2}>${text}</Button>`;
    });

    // 2. Submit Buttons: Should be Solid Gold
    const actionWords = ['حفظ', 'إضافة', 'نقل', 'حذف', 'تحديث', 'إنهاء الفصل', 'متابعة', 'جاري الحفظ...'];
    
    content = content.replace(/<Button([^>]*?)>(حفظ|إضافة|نقل|حذف|تحديث|إنهاء الفصل|متابعة|جاري\s*الحفظ\.\.\.|\{isSubmitting[^\}]*\})<\/Button>/g, function(match, p1, text) {
        // Check if it's already got outline then skip? No, we might have converted them.
        if (p1.includes('variant=\"outline\"')) return match; 
        
        let newP1 = p1.replace(/className=\"[^\"]*\"/g, '');
        return `<Button className="text-sm h-9 rounded-lg bg-[#D4AF37] hover:bg-[#C9A961] text-white font-bold transition-all shadow-sm border border-transparent px-4"${newP1}>${text}</Button>`;
    });

    // We also want to ensure the footer container aligns them right (flex justify-end gap-2 pt-2) without flex-col or flex-1 children.
    // If there is <div className="... flex gap-3 ..."> we want to switch to flex justify-end gap-2 pt-2
    // Let's modify any parent div of these buttons if possible. 
    // Usually they are in "flex gap-2" or "grid grid-cols-2" or "flex justify-end".
    
    content = content.replace(/<div className=\"flex gap-[23]\"\s*>/g, '<div className=\"flex justify-end gap-2 pt-2\">');
    content = content.replace(/<div className=\"flex flex-col-reverse sm:flex-row gap-3 mt-6[^>]*>/g, '<div className=\"flex justify-end gap-2 mt-6 pt-2\">');
    content = content.replace(/<div className=\"flex justify-between items-center mt-6\"/g, '<div className=\"flex justify-end gap-2 pt-2 mt-6\"');
    content = content.replace(/<div className=\"p-4 border-t border-neutral-100 flex gap-3\"/g, '<div className=\"p-4 border-t border-neutral-100 flex justify-end gap-2 pt-2\"');
    content = content.replace(/<div className=\"flex gap-4 pt-4 mt-6 border-t border-slate-100\"/g, '<div className=\"flex justify-end gap-2 pt-4 mt-6 border-t border-slate-100\"');
    content = content.replace(/<div className=\"grid grid-cols-2 gap-3 mt-6\"/g, '<div className=\"flex justify-end gap-2 mt-6 pt-2\"');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        replaced++;
    }
}

console.log('Processed buttons in ' + replaced + ' files.');
