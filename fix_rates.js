const fs=require('fs'); 
let code=fs.readFileSync('app/admin/statistics/page.tsx', 'utf8'); 

code=code.replace(/style=\{\{ width: '92%' \}\}/g, 'style={{ width: ${Math.round(circle.extStats?.attendanceRate || 0)}% }}');
code=code.replace(/style=\{\{ width: '85%' \}\}/g, 'style={{ width: ${Math.round(circle.extStats?.evalRate || 0)}% }}');

code=code.replace(/<span className=\"text-blue-600 font-bold\">92%<\/span>/g, '<span className=\"text-emerald-600 font-bold w-8 text-left\">{Math.round(circle.extStats?.attendanceRate || 0)}%</span>');
code=code.replace(/<span className=\"text-green-500 font-bold\">85%<\/span>/g, '<span className=\"text-sky-500 font-bold w-8 text-left\">{Math.round(circle.extStats?.evalRate || 0)}%</span>');

code=code.replace(/bg-blue-600/g, 'bg-emerald-500');
code=code.replace(/bg-green-500/g, 'bg-sky-500');

const tgt=\        const topRes = await fetch(\\\/api/statistics/top-performers?startDate=\&endDate=\\\\);
        if (topRes.ok) {
            const topJson = await topRes.json();
            if (topJson.topCircles) {
                setTopData(topJson);
                if (topJson.allCircleStats && data?.circles) {
                    const merged = data.circles.map(c => {
                        const st = topJson.allCircleStats.find(x => x.name === c.name);
                        return st ? { ...c, extStats: st } : c;
                    });
                    setCircles(merged);
                }
            }
        }\; 

code=code.replace(/const topRes = await fetch[\\s\\S]*?setTopData\\(topJson\\);\\s*\\}\\s*\\}/m, tgt); 

if (!code.includes('force-dynamic')) { 
  code='export const dynamic = \"force-dynamic\";\n'+code; 
} 

fs.writeFileSync('app/admin/statistics/page.tsx', code);
