const fs = require('fs');
const file = 'app/admin/student-plans/page.tsx';
let s = fs.readFileSync(file, 'utf8');

// Add states
if (!s.includes('const [startVerse, setStartVerse]')) {
    s = s.replace(
        'const [endOpen, setEndOpen] = useState(false);',
        'const [endOpen, setEndOpen] = useState(false);\n  const [startVerse, setStartVerse] = useState<string>("");\n  const [endVerse, setEndVerse] = useState<string>("");'
    );
}

if (!s.includes('const [prevStartVerse, setPrevStartVerse]')) {
    s = s.replace(
        'const [prevEndOpen, setPrevEndOpen] = useState(false);',
        'const [prevEndOpen, setPrevEndOpen] = useState(false);\n  const [prevStartVerse, setPrevStartVerse] = useState<string>("");\n  const [prevEndVerse, setPrevEndVerse] = useState<string>("");'
    );
}

// Add state clear
if (!s.includes('setStartVerse("");')) {
    s = s.replace(
        'setEndOpen(false);',
        'setEndOpen(false);\n    setStartVerse("");\n    setEndVerse("");\n    setPrevStartVerse("");\n    setPrevEndVerse("");'
    );
}

// UI Replacement function
function replaceSelect(s, labelText, surahState, surahSetState, surahOpenState, surahSetOpenState, verseState, setVerseState, dirText) {
    const rx = new RegExp(`\\{\\/\\* ${labelText} \\*\\/\\}\\s*<div className="space-y-1\\.5">[\\s\\S]*?<\\/Popover>\\s*<\\/div>`, 'g');
    
    const ui = `{/* ${labelText} */}
                    <div className="space-y-1.5 flex flex-col w-full">
                      <label className="text-xs font-semibold text-[#1a2332]">
                        ${labelText}
                      </label>
                      <div className="flex items-center gap-2 w-full">
                        <Popover open={${surahOpenState}} onOpenChange={${surahSetOpenState}}>
                          <PopoverTrigger asChild>
                            <button className="flex-1 flex items-center justify-between px-3 h-9 rounded-lg border border-[#D4AF37]/40 text-xs bg-white text-right hover:border-[#D4AF37] transition-colors">
                              <span className={${surahState} ? "text-[#1a2332] font-medium" : "text-neutral-400"}>
                                {${surahState}
                                  ? SURAHS.find((s) => s.number === parseInt(${surahState}))?.name
                                  : "اختر السورة"}
                              </span>
                              <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-0" align="start" dir="rtl">
                            <Command className="overflow-visible border-[#D4AF37]/20">
                              <CommandInput placeholder="ابحث عن سورة..." className="text-xs h-8" />
                              <CommandEmpty>لا توجد نتائج</CommandEmpty>
                              <CommandList className="max-h-48 overflow-y-auto surah-scroll" onWheel={(e) => { e.stopPropagation(); e.currentTarget.scrollTop += e.deltaY; }}>
                                {(${dirText} === "asc" ? SURAHS : surahsDescending).map((s) => (
                                  <CommandItem key={s.number} id={\`${surahState}-\${s.number}\`} value={s.name} onSelect={() => { ${surahSetState}(s.number.toString()); ${surahSetOpenState}(false); ${setVerseState}(""); }}>
                                    {s.name}
                                    {${surahState} === s.number.toString() && <Check className="w-3.5 h-3.5 mr-auto text-[#D4AF37]" />}
                                  </CommandItem>
                                ))}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        <Select value={${verseState}} onValueChange={${setVerseState}} disabled={!${surahState}}>
                          <SelectTrigger className="w-[80px] h-9 border-[#D4AF37]/40 text-xs bg-white px-2" dir="rtl">
                            <SelectValue placeholder="الآية" />
                          </SelectTrigger>
                          <SelectContent dir="rtl" className="max-h-48">
                            {${surahState} &&
                              Array.from({ length: SURAHS.find(s => s.number === parseInt(${surahState}))?.verseCount || 0 }, (_, i) => i + 1).map((v) => (
                                <SelectItem key={v} value={v.toString()} className="text-xs text-right">
                                  {v}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>`;
                    
    console.log("Replacing", labelText);
    return s.replace(rx, ui);
}

s = replaceSelect(s, 'بداية الحفظ السابق', 'prevStartSurah', 'setPrevStartSurah', 'prevStartOpen', 'setPrevStartOpen', 'prevStartVerse', 'setPrevStartVerse', 'direction');
s = replaceSelect(s, 'نهاية الحفظ السابق', 'prevEndSurah', 'setPrevEndSurah', 'prevEndOpen', 'setPrevEndOpen', 'prevEndVerse', 'setPrevEndVerse', 'direction');
s = replaceSelect(s, 'بداية خطة الحفظ', 'startSurah', 'setStartSurah', 'startOpen', 'setStartOpen', 'startVerse', 'setStartVerse', 'direction');
s = replaceSelect(s, 'نهاية خطة الحفظ', 'endSurah', 'setEndSurah', 'endOpen', 'setEndOpen', 'endVerse', 'setEndVerse', 'direction');

// Add start_verse and so on to handleSave body payload
if (!s.includes('start_verse: parseInt(startVerse)')) {
    s = s.replace(
        'start_surah_name: startSurahData.name,',
        'start_surah_name: startSurahData.name,\n          start_verse: startVerse ? parseInt(startVerse) : null,'
    );
}
if (!s.includes('end_verse: parseInt(endVerse)')) {
    s = s.replace(
        'end_surah_name: endSurahData.name,',
        'end_surah_name: endSurahData.name,\n          end_verse: endVerse ? parseInt(endVerse) : null,'
    );
}

if (!s.includes('prev_start_verse: prevStartVerse')) {
    s = s.replace(
        'prev_end_surah: prevEndSurah ? parseInt(prevEndSurah) : null,',
        'prev_end_surah: prevEndSurah ? parseInt(prevEndSurah) : null,\n          prev_start_verse: prevStartVerse ? parseInt(prevStartVerse) : null,\n          prev_end_verse: prevEndVerse ? parseInt(prevEndVerse) : null,'
    );
}


fs.writeFileSync(file, s);
console.log("Done");
