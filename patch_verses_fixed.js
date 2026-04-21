const fs = require('fs');
const file = 'app/admin/student-plans/page.tsx';
let data = fs.readFileSync(file, 'utf8');

// For startSurah
data = data.replace(
  /<div className="w-24">\s*<Select value=\{startVerse\} onValueChange=\{setStartVerse\} disabled=\{!startSurah\}>[\s\S]*?<\/Select>\s*<\/div>\s*(\)\})?/g,
  `<Select value={startVerse} onValueChange={setStartVerse} disabled={!startSurah}>
                          <SelectTrigger className="w-[80px] h-10 border-[#D4AF37]/40 hover:border-[#D4AF37] transition-colors rounded-xl bg-white text-sm" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48" dir="rtl">
                            {startSurah && Array.from({ length: SURAHS.find((s) => s.number === parseInt(startSurah))?.verseCount || 0 }, (_, i) => i + 1).map((v) => (
                                <SelectItem key={v} value={v.toString()} className="text-right">
                                  {v}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>`
);

// For endSurah
data = data.replace(
  /<div className="w-24">\s*<Select value=\{endVerse\} onValueChange=\{setEndVerse\} disabled=\{!endSurah\}>[\s\S]*?<\/Select>\s*<\/div>\s*(\)\})?/g,
  `<Select value={endVerse} onValueChange={setEndVerse} disabled={!endSurah}>
                          <SelectTrigger className="w-[80px] h-10 border-[#D4AF37]/40 hover:border-[#D4AF37] transition-colors rounded-xl bg-white text-sm" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48" dir="rtl">
                            {endSurah && Array.from({ length: SURAHS.find((s) => s.number === parseInt(endSurah))?.verseCount || 0 }, (_, i) => i + 1).map((v) => (
                                <SelectItem key={v} value={v.toString()} className="text-right">
                                  {v}
                                </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>`
);

fs.writeFileSync(file, data);
console.log('Main plan verses updated.');
