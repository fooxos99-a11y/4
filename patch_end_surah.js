const fs = require('fs');
let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf-8');

code = code.replace(
  'return surahsDescending.filter((s) => s.number > startNum)',
  'return surahsDescending.filter((s) => s.number >= startNum)'
);
code = code.replace(
  'return SURAHS.filter((s) => s.number < startNum)',
  'return SURAHS.filter((s) => s.number <= startNum)'
);

const openChangeTarget = '<Popover open={endOpen} onOpenChange={setEndOpen}>';
const openChangeCode = `<Popover open={endOpen} onOpenChange={(open) => {
                  setEndOpen(open);
                  if (open && startSurah) {
                    setTimeout(() => {
                      const el = document.getElementById('end-surah-' + startSurah);
                      if (el) el.scrollIntoView({ block: 'center' });
                    }, 50);
                  }
                }}>`;
code = code.replace(openChangeTarget, openChangeCode);

const commandItemTarget = `                          <CommandItem
                            key={s.number}
                            value={s.name}
                            onSelect={() => { setEndSurah(String(s.number)); setEndOpen(false) }}`;
const commandItemNew = `                          <CommandItem
                            id={\`end-surah-\${s.number}\`}
                            key={s.number}
                            value={s.name}
                            onSelect={() => { setEndSurah(String(s.number)); setEndOpen(false) }}`;

code = code.replace(commandItemTarget, commandItemNew);

fs.writeFileSync('app/admin/student-plans/page.tsx', code);
console.log('patched');
