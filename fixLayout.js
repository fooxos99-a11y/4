const fs = require(\"fs\");
let code = fs.readFileSync(\"app/admin/student-plans/page.tsx\", \"utf-8\");

const targetStart = code.indexOf(\"<div className=\\\"grid grid-cols-1 md:grid-cols-2 gap-3 mt-4\\\">\");
const checkText = \"{/* ????? ???????? */}\";
const idx2 = code.indexOf(checkText, targetStart);

if (targetStart > -1 && idx2 > targetStart && idx2 < targetStart + 100) {
  const blockEndStr = \"</div>\\n              </div>\";
  const targetEnd = code.indexOf(blockEndStr, targetStart) + blockEndStr.length;
  code = code.substring(0, targetStart) + code.substring(targetEnd);
}

const anchor = \"</SelectContent>\\n                </Select>\\n              </div>\\n            </div>\";
const p = \"\\n\\n            {/* ???????? ?????? */}\\n            <div className=\\\"grid grid-cols-1 md:grid-cols-2 gap-3 mt-6\\\">\\n              <div className=\\\"space-y-2\\\">\\n                <label className=\\\"text-sm font-semibold text-[#1a2332]\\\">????? ???????? ??????</label>\\n                <div className=\\\"relative\\\">\\n                  <Select value={muraajaaPages} onValueChange={setMuraajaaPages} dir=\\\"rtl\\\">\\n                    <SelectTrigger className=\\\"h-10 text-sm rounded-xl border-[#D4AF37]/40 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20 bg-white/50 w-full text-right shadow-sm dir-rtl\\\" dir=\\\"rtl\\\">\\n                      <SelectValue />\\n                    </SelectTrigger>\\n                    <SelectContent className=\\\"text-right dir-rtl\\\" dir=\\\"rtl\\\">\\n                      {MURAAJAA_OPTIONS.map((o) => (\\n                        <SelectItem key={o.value} value={o.value} className=\\\"text-right justify-start flex-row-reverse text-sm\\\">\\n                         {o.label}\\n                        </SelectItem>\\n                      ))}\\n                    </SelectContent>\\n                  </Select>\\n                </div>\\n              </div>\\n\\n              <div className=\\\"space-y-2\\\">\\n                <label className=\\\"text-sm font-semibold text-[#1a2332]\\\">????? ????? ??????</label>\\n                <div className=\\\"relative\\\">\\n                  <Select value={rabtPages} onValueChange={setRabtPages} dir=\\\"rtl\\\">\\n                    <SelectTrigger className=\\\"h-10 text-sm rounded-xl border-[#D4AF37]/40 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20 bg-white/50 w-full text-right shadow-sm dir-rtl\\\" dir=\\\"rtl\\\">\\n                      <SelectValue />\\n                    </SelectTrigger>\\n                    <SelectContent className=\\\"text-right dir-rtl\\\" dir=\\\"rtl\\\">\\n                      {RABT_OPTIONS.map((o) => (\\n                        <SelectItem key={o.value} value={o.value} className=\\\"text-right justify-start flex-row-reverse text-sm\\\">\\n                          {o.label}\\n                        </SelectItem>\\n                      ))}\\n                    </SelectContent>\\n                  </Select>\\n                </div>\\n              </div>\\n            </div>\";

code = code.replace(anchor, anchor + p);
fs.writeFileSync(\"app/admin/student-plans/page.tsx\", code);
console.log(\"Done\");
