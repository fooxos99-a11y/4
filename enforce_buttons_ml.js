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

const files = walk('components/admin-modals').concat(['app/admin/dashboard/page.tsx', 'components/shared-modals.tsx', 'app/admin/students/page.tsx']);
let replaced = 0;

for (let file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    // We want to handle buttons that have multiline text inside
    // Match: <Button variant="outline" ... > [\s\S]*?(إلغاء|إغلاق)[\s\S]*?<\/Button>
    content = content.replace(/<Button([^>]*?)variant=[\"']outline[\"']([^>]*?)>\s*(إلغاء|إغلاق)\s*<\/Button>/g, function(match, p1, p2, text) {
        let newP1 = p1.replace(/className=\"[^\"]*\"/g, '');
        let newP2 = p2.replace(/className=\"[^\"]*\"/g, '');
        return `<Button variant="outline" className="text-sm h-9 rounded-lg border-[#D4AF37]/50 text-neutral-600 px-4"${newP1}${newP2}>${text}</Button>`;
    });
    
    // And for submit buttons
    content = content.replace(/<Button([^>]*?)>\s*(حفظ|إضافة|نقل|حذف|تحديث|إنهاء\s*الفصل|متابعة|جاري\s*الحفظ\.\.\.|\{isSubmitting\s*\?\s*\"جاري\s*الحفظ\.\.\.\"\s*:\s*\"[^\"]*\"\}|\{isSubmitting\s*\?\s*\'جاري\s*الحفظ\.\.\.\'\s*:\s*\'[^\']*\'\})\s*<\/Button>/g, function(match, p1, text) {
        if (p1.includes('variant=\"outline\"') || p1.includes("variant='outline'")) return match; 
        
        let newP1 = p1.replace(/className=\"[^\"]*\"/g, '');
        return `<Button className="text-sm h-9 rounded-lg bg-[#D4AF37] hover:bg-[#C9A961] text-white font-bold transition-all shadow-sm border border-transparent px-4"${newP1}>${text}</Button>`;
    });

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        replaced++;
    }
}

console.log('Processed buttons in ' + replaced + ' files.');
