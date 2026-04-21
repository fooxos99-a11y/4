const fs = require('fs');
let code = fs.readFileSync('app/admin/statistics/page.tsx', 'utf8');

if (!code.includes('topData.allCircleStats')) { 
  code = code.replace(/setTopData\(topJson\);\s*\}\s*\}/, 
    'setTopData(topJson);\nif (topJson.allCircleStats && data?.circles) { const merged = data.circles.map(c => { const st = topJson.allCircleStats.find(x => x.name === c.name); return st ? { ...c, extStats: st } : c; }); setCircles(merged); }\n}\n}'
  ); 
} 

code = code.replace(/>92%</g, '>{Math.round(circle.extStats?.attendanceRate || 0)}%<'); 
code = code.replace(/>85%</g, '>{Math.round(circle.extStats?.evalRate || 0)}%<'); 

code = code.replace(/style=\{\{ width: '92%' \}\}/g, 'style={{ width: ${Math.round(circle.extStats?.attendanceRate || 0)}% }}'); 
code = code.replace(/style=\{\{ width: '85%' \}\}/g, 'style={{ width: ${Math.round(circle.extStats?.evalRate || 0)}% }}'); 

code = code.replace(/bg-blue-600/g, 'bg-emerald-500'); 
code = code.replace(/bg-green-500/g, 'bg-sky-500'); 

fs.writeFileSync('app/admin/statistics/page.tsx', code);
