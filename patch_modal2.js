const fs = require('fs');
let code = fs.readFileSync('app/admin/pathways/page.tsx', 'utf8');

let r1 = '  const [showResultsModal, setShowResultsModal] = useState(false)\n  const [levelResults, setLevelResults] = useState<any[]>([])\n  const [isLoadingResults, setIsLoadingResults] = useState(false)\n  const [editTitle, setEditTitle] = useState("")\n  const [editDescription, setEditDescription] = useState("")';

if (!code.includes('showResultsModal')) {
    code = code.replace(/  const \[editTitle, setEditTitle\] = useState\(\"\"\)\r?\n  const \[editDescription, setEditDescription\] = useState\(\"\"\)/g, r1);

    // replace 2
    let s2 = '  async function loadQuizzes() {';
    let r2 = '  async function loadLevelResults() {\n    if (!selectedLevel || !selectedHalaqah) return;\n    setIsLoadingResults(true);\n    const { data, error } = await supabase\n      .from("pathway_level_completions")\n      .select("id, student_id, points, level_number, students!inner(name, halaqah)")\n      .eq("level_number", selectedLevel)\n      .eq("students.halaqah", selectedHalaqah);\n    \n    if (!error && data) {\n      setLevelResults(data.map((r: any) => ({\n        id: r.id,\n        student_id: r.student_id,\n        points: r.points,\n        student_name: r.students?.name || "-",\n      })));\n    } else {\n      setLevelResults([]);\n    }\n    setIsLoadingResults(false);\n  }\n\n  async function loadQuizzes() {';
    code = code.replace(s2, r2);

    // replace 3
    let s3 = 'onClick={() => router.push("/admin/pathways-results")}';
    let r3 = 'onClick={() => { loadLevelResults(); setShowResultsModal(true); }}';
    code = code.replace(s3, r3);

    // replace 4
    let r4 = '      <Footer />\n\n      {showResultsModal && (\n        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 min-h-[100dvh] overflow-y-auto">\n          <div className="bg-white rounded-2xl w-full max-w-xl mx-auto shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">\n            <div className="px-6 py-4 border-b border-[#D4AF37]/20 flex justify-between items-center bg-[#D4AF37]/5 shrink-0">\n              <h3 className="font-bold text-lg text-[#1a2332]">\n                نتائج حلقة {selectedHalaqah} - المستوى {selectedLevel}\n              </h3>\n              <button \n                onClick={() => setShowResultsModal(false)}\n                className="text-neutral-400 hover:text-red-500 transition-colors p-2 text-xl font-bold"\n              >✕</button>\n            </div>\n            <div className="p-6 overflow-y-auto min-h-[200px]">\n              {isLoadingResults ? (\n                <div className="flex justify-center items-center py-10">\n                  <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />\n                </div>\n              ) : levelResults.length === 0 ? (\n                <div className="text-center py-10 text-neutral-500 font-bold">\n                  <p>لا يوجد طلاب أكملوا هذا المستوى بعد</p>\n                </div>\n              ) : (\n                <div className="space-y-3">\n                  {levelResults.map((r, i) => (\n                    <div key={r.id} className="flex justify-between items-center p-3 rounded-lg border border-[#D4AF37]/20 bg-[#fafaf9]">\n                      <div className="flex items-center gap-3">\n                        <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 flex flex-col items-center justify-center text-xs font-bold text-[#D4AF37]">{i + 1}</span>\n                        <span className="font-semibold text-[#1a2332]">{r.student_name}</span>\n                      </div>\n                      <span className="px-3 py-1 rounded bg-[#D4AF37] text-white text-sm font-bold">{r.points} نقطة</span>\n                    </div>\n                  ))}\n                </div>\n              )}\n            </div>\n            <div className="px-6 py-4 border-t border-[#D4AF37]/20 bg-neutral-50 flex justify-end shrink-0">\n              <Button onClick={() => setShowResultsModal(false)} variant="outline">إغلاق</Button>\n            </div>\n          </div>\n        </div>\n      )}\n\n    </div>\n  )\n}'
    code = code.replace(/      <Footer \/>\r?\n    <\/div>\r?\n  \)\r?\n}/, r4);

    fs.writeFileSync('app/admin/pathways/page.tsx', code);
    console.log('patched successfully!');
}