const fs = require('fs');
const file = 'app/teacher/halaqah/[id]/page.tsx';
let data = fs.readFileSync(file, 'utf8');

data = data.replace(
    /<div className="text-center text-neutral-500 py-6">جاري جلب الأيام المعلقة\.\.\.<\/div>/g,
    '<div className="flex justify-center items-center py-6"><Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" /></div>'
);

data = data.replace(
    /<div className="text-center text-emerald-600 font-bold py-6">لا توجد أيام متأخرة للتعويض بفضل الله!<\/div>/g,
    '<div className="text-center text-[#D4AF37] font-bold py-6">لا يوجد أيام تم التفريط فيها</div>'
);

data = data.replace(
    /className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1 h-8 text-xs font-bold transition-all shrink-0"/g,
    'className="bg-[#D4AF37] hover:bg-[#C9A961] text-white rounded-lg px-3 py-1 h-8 text-xs font-bold transition-all shrink-0"'
);

fs.writeFileSync(file, data);
console.log('patched');
