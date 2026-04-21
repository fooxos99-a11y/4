const fs = require('fs');

let code = fs.readFileSync('app/profile/page.tsx', 'utf-8');

code = code.replace(
  'من {SURAHS.find(s => s.number === planData.prev_start_surah)?.name || "—"} إلى {SURAHS.find(s => s.number === planData.prev_end_surah)?.name || "—"}',
  'من {SURAHS.find(s => s.number === (planData.prev_start_surah || planData.start_surah_number))?.name || "—"} إلى {SURAHS.find(s => s.number === (planData.prev_end_surah || planData.end_surah_number))?.name || "—"}'
);

code = code.replace(
  'من {SURAHS.find(s => s.number === planData.prev_start_surah)?.name || "—"} إلى {SURAHS.find(s => s.number === planData.prev_end_surah)?.name || "—"}',
  'من {SURAHS.find(s => s.number === (planData.prev_start_surah || planData.start_surah_number))?.name || "—"} إلى {SURAHS.find(s => s.number === (planData.prev_end_surah || planData.end_surah_number))?.name || "—"}'
);

fs.writeFileSync('app/profile/page.tsx', code);
console.log('Surahs patched');
