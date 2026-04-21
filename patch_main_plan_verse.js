const fs = require('fs');

const path = 'app/admin/student-plans/page.tsx';
let data = fs.readFileSync(path, 'utf8');

// The replacement for startSurah
const startSurahPattern = /(<Popover open=\{startOpen\} onOpenChange=\{setStartOpen\}>[\s\S]*?<\/Popover>)/;
const startSurahReplacement = `
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      $1
                    </div>
                    {startSurah && (
                      <div className="w-24">
                        <Select value={startVerse} onValueChange={setStartVerse}>
                          <SelectTrigger className="h-10 border-[#D4AF37]/40 hover:border-[#D4AF37] transition-colors rounded-xl bg-white text-sm" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            <SelectGroup>
                              <SelectItem value="start">من البداية</SelectItem>
                              {Array.from({ length: SURAHS.find((s) => s.number === parseInt(startSurah))?.ayahs || 0 }, (_, i) => i + 1).map((ayah) => (
                                <SelectItem key={ayah} value={ayah.toString()}>
                                  آية {ayah}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>`;

data = data.replace(startSurahPattern, startSurahReplacement);

// The replacement for endSurah
const endSurahPattern = /(<Popover open=\{endOpen\} onOpenChange=\{setEndOpen\}>[\s\S]*?<\/Popover>)/;
const endSurahReplacement = `
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      $1
                    </div>
                    {endSurah && (
                      <div className="w-24">
                        <Select value={endVerse} onValueChange={setEndVerse}>
                          <SelectTrigger className="h-10 border-[#D4AF37]/40 hover:border-[#D4AF37] transition-colors rounded-xl bg-white text-sm" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            <SelectGroup>
                              <SelectItem value="end">إلى النهاية</SelectItem>
                              {Array.from({ length: SURAHS.find((s) => s.number === parseInt(endSurah))?.ayahs || 0 }, (_, i) => i + 1).map((ayah) => (
                                <SelectItem key={ayah} value={ayah.toString()}>
                                  آية {ayah}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>`;

data = data.replace(endSurahPattern, endSurahReplacement);

fs.writeFileSync(path, data);
console.log('Patched main plan surahs successfully!');
