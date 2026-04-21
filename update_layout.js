const fs = require('fs');
let content = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf-8');

// Change grid columns to 3
content = content.replace(
  '<div className="grid grid-cols-2 gap-3">',
  '<div className="grid grid-cols-3 gap-3">'
);

// Remove the separate المقدار اليومي section and insert it inside the same grid
const oldBottomSection = `                </Popover>
                {startSurah && endSurahOptions.length === 0 && (
                  <p className="text-[11px] text-red-400">لا توجد سور صالحة</p>
                )}
              </div>
            </div>

            {/* المقدار اليومي */}
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">المقدار اليومي</label>
                <Select value={dailyPages} onValueChange={setDailyPages}>
                  <SelectTrigger className="border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAILY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>`;

const newBottomSection = `                </Popover>
                {startSurah && endSurahOptions.length === 0 && (
                  <p className="text-[11px] text-red-400">لا توجد سور صالحة</p>
                )}
              </div>

              {/* المقدار اليومي بجانب بداية ونهاية الخطة */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">المقدار اليومي</label>
                <Select value={dailyPages} onValueChange={setDailyPages}>
                  <SelectTrigger className="h-10 border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAILY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>`;

if(content.includes(oldBottomSection)) {
  content = content.replace(oldBottomSection, newBottomSection);
  fs.writeFileSync('app/admin/student-plans/page.tsx', content);
  console.log("Successfully placed 'المقدار اليومي' next to 'نهاية الخطة'");
} else {
  console.log("Section not found, perhaps whitespace or formatting issues.");
}
