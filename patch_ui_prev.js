const fs = require('fs');

let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf-8');

const anchor = '{/* بداية ونهاية الخطة — والمقدار اليومي جنب بعض */}';
const targetString = anchor;

const codeToInsert = `            {/* الحفظ السابق وطريقة المراجعة والربط */}
            <div className="space-y-2 pt-2 pb-2 border-y border-[#D4AF37]/20">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#1a2332] cursor-pointer">
                <input 
                  type="checkbox" 
                  className="rounded border-[#D4AF37] text-[#D4AF37] focus:ring-[#C9A961]"
                  checked={hasPrevious} 
                  onChange={(e) => setHasPrevious(e.target.checked)} 
                />
                هل يوجد حفظ سابق؟ (تفعيل المراجعة والربط)
              </label>

              {hasPrevious && (
                <div className="bg-[#D4AF37]/5 p-3 rounded-xl border border-[#D4AF37]/20 space-y-3 mt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* بداية الحفظ السابق */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#1a2332]">بداية الحفظ السابق</label>
                      <Popover open={prevStartOpen} onOpenChange={setPrevStartOpen}>
                        <PopoverTrigger asChild>
                          <button className="w-full flex items-center justify-between px-3 h-9 rounded-lg border border-[#D4AF37]/40 text-xs bg-white text-right hover:border-[#D4AF37] transition-colors">
                            <span className={prevStartSurah ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                              {prevStartSurah ? SURAHS.find(s => s.number === parseInt(prevStartSurah))?.name : "اختر السورة"}
                            </span>
                            <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                          <Command className="overflow-visible border-[#D4AF37]/20">
                            <CommandInput placeholder="ابحث عن سورة..." className="text-xs h-8" />
                            <CommandEmpty>لا توجد نتائج</CommandEmpty>
                            <CommandList className="max-h-48 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}>
                               {(direction === "asc" ? SURAHS : [...SURAHS].reverse()).map((s) => (
                                <CommandItem
                                  key={s.number}
                                  value={s.name}
                                  onSelect={() => { setPrevStartSurah(s.number.toString()); setPrevStartOpen(false); }}
                                >
                                  {s.name}
                                  {prevStartSurah === s.number.toString() && <Check className="w-3.5 h-3.5 mr-auto text-[#D4AF37]" />}
                                </CommandItem>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* نهاية الحفظ السابق */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#1a2332]">نهاية الحفظ السابق</label>
                      <Popover open={prevEndOpen} onOpenChange={setPrevEndOpen}>
                        <PopoverTrigger asChild>
                          <button className="w-full flex items-center justify-between px-3 h-9 rounded-lg border border-[#D4AF37]/40 text-xs bg-white text-right hover:border-[#D4AF37] transition-colors">
                            <span className={prevEndSurah ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                              {prevEndSurah ? SURAHS.find(s => s.number === parseInt(prevEndSurah))?.name : "اختر السورة"}
                            </span>
                            <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                          <Command className="overflow-visible border-[#D4AF37]/20">
                            <CommandInput placeholder="ابحث عن سورة..." className="text-xs h-8" />
                            <CommandEmpty>لا توجد نتائج</CommandEmpty>
                            <CommandList className="max-h-48 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}>
                               {(direction === "asc" ? SURAHS : [...SURAHS].reverse()).map((s) => (
                                <CommandItem
                                  key={s.number}
                                  value={s.name}
                                  onSelect={() => { setPrevEndSurah(s.number.toString()); setPrevEndOpen(false); }}
                                >
                                  {s.name}
                                  {prevEndSurah === s.number.toString() && <Check className="w-3.5 h-3.5 mr-auto text-[#D4AF37]" />}
                                </CommandItem>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                     {/* مقدار المراجعة */}
                     <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#1a2332]">مقدار المراجعة اليومي</label>
                      <Select value={muraajaaPages} onValueChange={setMuraajaaPages} dir="rtl">
                        <SelectTrigger className="w-full text-xs h-9 text-right bg-white" dir="rtl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {DAILY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="text-right text-xs dir-rtl">
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* مقدار الربط */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#1a2332]">مقدار الربط اليومي</label>
                      <Select value={rabtPages} onValueChange={setRabtPages} dir="rtl">
                        <SelectTrigger className="w-full text-xs h-9 text-right bg-white" dir="rtl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {DAILY_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="text-right text-xs dir-rtl">
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                  </div>
                </div>
              )}
            </div>

            `;

if (!code.includes('بداية الحفظ السابق')) {
  code = code.replace(targetString, codeToInsert + targetString);
  fs.writeFileSync('app/admin/student-plans/page.tsx', code);
  console.log('UI appended');
} else {
  console.log('UI already appended');
}
