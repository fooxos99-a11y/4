const fs = require('fs');
let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf-8');

const muraajaaBlockStr = \            {/* ????? ???????? ?????? - ???? ?????? */}
            <div className="grid grid-cols-2 gap-3 mb-2 pb-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">
                  ????? ???????? ??????
                </label>
                <Select
                  value={muraajaaPages}
                  onValueChange={setMuraajaaPages}
                  dir="rtl"
                >
                  <SelectTrigger
                    className="border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-xl text-right bg-white"
                    dir="rtl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {MURAAJAA_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-right dir-rtl"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-[#1a2332]">
                  ????? ????? ??????
                </label>
                <Select
                  value={rabtPages}
                  onValueChange={setRabtPages}
                  dir="rtl"
                >
                  <SelectTrigger
                    className="border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-xl text-right bg-white"
                    dir="rtl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    {RABT_OPTIONS.map((o) => (
                      <SelectItem
                        key={o.value}
                        value={o.value}
                        className="text-right dir-rtl"
                      >
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>\;

const dailyPagesBlockStr = \            {/* ??????? ?????? */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[#1a2332]">
                ??????? ??????
              </label>
              <Select value={dailyPages} onValueChange={setDailyPages}>
                <SelectTrigger
                  className="border-[#D4AF37]/40 focus:border-[#D4AF37] rounded-xl text-right bg-white"
                  dir="rtl"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {DAILY_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-right dir-rtl"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>\;

if(code.includes(muraajaaBlockStr) && code.includes(dailyPagesBlockStr)) {
   code = code.replace(muraajaaBlockStr, '');
   code = code.replace(dailyPagesBlockStr, '');
   
   // Replace grid 2 with grid 3 block for the plan
   code = code.replace(
      '{/* ????? ?????? ?????  ??? ??? */}',
      '{/* ????? ?????? ?????  ??? ??? */}' 
   );
   
   code = code.replace('className="grid grid-cols-2 gap-3"','className="grid grid-cols-3 gap-3"'); // This affects the start/end surah grid, we will need to exact match

   fs.writeFileSync('output.tsx', code);
   console.log('Processed');
} else {
   console.log('Not entirely matched');
}
