const fs = require('fs');
let code = fs.readFileSync('app/admin/student-plans/page.tsx', 'utf-8');

const newStates = `  // الحفظ السابق والربط والمراجعة
  const [hasPrevious, setHasPrevious] = useState(false)
  const [prevStartSurah, setPrevStartSurah] = useState<string>('')
  const [prevEndSurah, setPrevEndSurah] = useState<string>('')
  const [prevStartOpen, setPrevStartOpen] = useState(false)
  const [prevEndOpen, setPrevEndOpen] = useState(false)
  const [rabtPages, setRabtPages] = useState<string>('0.5')
  const [muraajaaPages, setMuraajaaPages] = useState<string>('0.5')
`;

if (!code.includes('setHasPrevious')) {
  code = code.replace(
    '  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)',
    '  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)\n' + newStates
  );
  
  // Also we need to reset these variables when opening the dialog
  code = code.replace(
    '    setDailyPages("1")',
    '    setDailyPages("1")\n    setHasPrevious(false)\n    setPrevStartSurah("")\n    setPrevEndSurah("")\n    setRabtPages("0.5")\n    setMuraajaaPages("0.5")'
  )
  
  fs.writeFileSync('app/admin/student-plans/page.tsx', code);
  console.log('States added');
} else {
  console.log('States already existed');
}
