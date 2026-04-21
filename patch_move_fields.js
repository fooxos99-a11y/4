const fs = require('fs');

let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf-8');

code = code.replace(
  'const [rabtPages, setRabtPages] = useState<string>("0.5")',
  'const [rabtPages, setRabtPages] = useState<string>("10")'
);

code = code.replace(
  'const [muraajaaPages, setMuraajaaPages] = useState<string>("0.5")',
  'const [muraajaaPages, setMuraajaaPages] = useState<string>("20")'
);

code = code.replace('setRabtPages("0.5")', 'setRabtPages("10")');
code = code.replace('setMuraajaaPages("0.5")', 'setMuraajaaPages("20")');

// Extract the Muraajaa/Rabt block outside of has_previous validation
code = code.replace(
  '{hasPrevious && (',
  `
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                     {/* مقدار المراجعة */}
                     <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#1a2332]">مقدار المراجعة اليومي</label>
                      <Select value={muraajaaPages} onValueChange={setMuraajaaPages} dir="rtl">
                        <SelectTrigger className="w-full text-xs h-9 text-right bg-white" dir="rtl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                          {MURAAJAA_OPTIONS.map((o) => (
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
                          {RABT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="text-right text-xs dir-rtl">
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
              </div>

              {hasPrevious && (`
);

// We need to remove the internal one inside has_previous
const removeBlock = `                     {/* مقدار المراجعة */}
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
                    </div>`;

code = code.replace(removeBlock, '');

// Also change the payload saving logic
// We want to save rabt_pages and muraajaa_pages regardless of hasPrevious
code = code.replace(
  'rabt_pages: hasPrevious ? parseFloat(rabtPages) : null,',
  'rabt_pages: parseFloat(rabtPages),'
);
code = code.replace(
  'muraajaa_pages: hasPrevious ? parseFloat(muraajaaPages) : null,',
  'muraajaa_pages: parseFloat(muraajaaPages),'
);

fs.writeFileSync('app/admin/student-plans/page.tsx', code);
console.log('Fields moved permanently');
