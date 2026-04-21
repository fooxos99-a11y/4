const fs = require("fs");
let c = fs.readFileSync("app/admin/student-plans/page.tsx", "utf-8");

const p1 = c.indexOf("<div className=\"grid grid-cols-1 md:grid-cols-2 gap-3 mt-4\">");
const p2 = c.indexOf("{/* ????? ???????? */}");

if (p1 > -1 && p2 > -1 && p2 < p1 + 100) {
    const endTag = "</div>\r\n              </div>"; // sometimes \r\n, sometimes \n
    let targetP2 = c.indexOf(endTag, c.indexOf("{/* ????? ????? */}"));
    if (targetP2 === -1) {
        targetP2 = c.indexOf("</div>\n              </div>", c.indexOf("{/* ????? ????? */}"));
    }
    if (targetP2 > -1) {
        c = c.substring(0, p1) + c.substring(targetP2 + 30);
    }
}

const findView = c.indexOf("{/* ?????? ????? */}");
if (findView !== -1) {
    const component = `
            {/* ???????? ?????? */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1a2332]">????? ???????? ??????</label>
                <div className="relative">
                  <Select value={muraajaaPages} onValueChange={setMuraajaaPages} dir="rtl">
                    <SelectTrigger className="h-10 text-sm rounded-xl border-[#D4AF37]/40 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20 bg-white/50 w-full text-right shadow-sm dir-rtl" dir="rtl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-right dir-rtl" dir="rtl">
                      {MURAAJAA_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-right justify-start flex-row-reverse text-sm">
                         {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1a2332]">????? ????? ??????</label>
                <div className="relative">
                  <Select value={rabtPages} onValueChange={setRabtPages} dir="rtl">
                    <SelectTrigger className="h-10 text-sm rounded-xl border-[#D4AF37]/40 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20 bg-white/50 w-full text-right shadow-sm dir-rtl" dir="rtl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="text-right dir-rtl" dir="rtl">
                      {RABT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="text-right justify-start flex-row-reverse text-sm">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

`;
    c = c.substring(0, findView) + component + c.substring(findView);
}

fs.writeFileSync("app/admin/student-plans/page.tsx", c);
console.log("Done layout patch");

