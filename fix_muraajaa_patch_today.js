const fs = require('fs');
let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf-8');

const constants = \
const MURAAJAA_OPTIONS = [
  { label: 'لا يوجد', value: '0' },
  { label: 'نصف وجه', value: '0.5' },
  { label: 'وجه', value: '1' },
  { label: 'وجهين', value: '2' },
  { label: '3 أوجه', value: '3' },
  { label: '4 أوجه', value: '4' },
  { label: '5 أوجه', value: '5' },
  { label: 'ربع جزء', value: '5.5' },
  { label: 'نصف جزء', value: '10' },
  { label: 'جزء', value: '20' },
];

const RABT_OPTIONS = [
  { label: 'لا يوجد', value: '0' },
  { label: 'نصف وجه', value: '0.5' },
  { label: 'وجه', value: '1' },
  { label: 'وجهين', value: '2' },
  { label: '3 أوجه', value: '3' },
  { label: '4 أوجه', value: '4' },
  { label: '5 أوجه', value: '5' },
  { label: 'ربع جزء', value: '5.5' },
  { label: 'نصف جزء', value: '10' },
  { label: 'جزء', value: '20' },
];
\;

if (!code.includes('MURAAJAA_OPTIONS')) {
  code = code.replace('const PREVIOUS_PLANS = [', constants + '\\nconst PREVIOUS_PLANS = [');
}

if (!code.includes('const [muraajaaPages, setMuraajaaPages]')) {
  code = code.replace('const [planEndSurah, setPlanEndSurah] = useState("");', 
    'const [planEndSurah, setPlanEndSurah] = useState("");\\n  const [muraajaaPages, setMuraajaaPages] = useState("0");\\n  const [rabtPages, setRabtPages] = useState("0");');
}

const dbPayloadStart = code.indexOf('const selectedPlan = {');
if (dbPayloadStart > -1) {
  if(!code.includes('daily_review_pages: parseFloat(muraajaaPages)')) {
    code = code.replace('end_surah: planEndSurah,', 'end_surah: planEndSurah,\\n      daily_review_pages: parseFloat(muraajaaPages),\\n      daily_link_pages: parseFloat(rabtPages),');
  }
}

// Ensure the new view logic is placed
const pos = code.indexOf('{/* معاينة الخطة */}');
const insertion = \            {/* المراجعة والربط */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1a2332]">مقدار المراجعة اليومي</label>
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
                <label className="text-sm font-semibold text-[#1a2332]">مقدار الربط اليومي</label>
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

\;

if (pos > -1 && !code.includes('مقدار المراجعة اليومي</label>')) {
   code = code.substring(0, pos) + insertion + code.substring(pos);
}

// Let's remove the old Muraajaa bindings
const startCut = code.indexOf('{hasPrevious && (');
if(startCut > -1 && code.substring(startCut, startCut + 200).includes('space-y-3')) {
   const endCut = code.indexOf('</div>\\n            )}', startCut);
   if (endCut > -1) {
       code = code.substring(0, startCut) + code.substring(endCut + 19);
   }
}

fs.writeFileSync('app/admin/student-plans/page.tsx', code, 'utf8');
