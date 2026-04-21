const fs = require('fs');
let code = fs.readFileSync('app/teacher/halaqah/[id]/page.tsx', 'utf8');

// 1. imports
if (!code.includes('import { RotateCcw')) {
  code = code.replace('MessageSquare,', 'MessageSquare,\n        RotateCcw,');
}

// 2. States
const stateSearch = `const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)`;
const statesToAdd = `const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false)
        const [isCompDialogOpen, setIsCompDialogOpen] = useState(false)
        const [compStudentId, setCompStudentId] = useState<number | null>(null)
        const [missedDays, setMissedDays] = useState<any[]>([])
        const [isCompLoading, setIsCompLoading] = useState(false)`;

code = code.replace(stateSearch, statesToAdd);

// 3. openCompDialog Function
const funcSearch = `const openNotesDialog = (studentId: number) => {`;
const funcToAdd = `const openCompDialog = async (studentId: number) => {
                setCompStudentId(studentId)
                setMissedDays([])
                setIsCompDialogOpen(true)
                setIsCompLoading(true)
                try {
                        const res = await fetch(\`/api/compensation/missed?student_id=\${studentId}\`)
                        const data = await res.json()
                        setMissedDays(data.missedDays || [])
                } catch (e) {
                        console.error(e)
                } finally {
                        setIsCompLoading(false)
                }
        }

        const handleCompensate = async (date: string) => {
                try {
                        const res = await fetch(\`/api/compensation\`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                        student_id: compStudentId,
                                        teacher_id: teacherData.id,
                                        halaqah: teacherData.halaqah,
                                        date
                                })
                        })
                        const data = await res.json()
                        if (data.success) {
                                // أزل اليوم من القائمة
                                setMissedDays(prev => prev.filter(d => d.date !== date))
                                await showAlert(\`تم التعويض بنجاح وتم إضافة \${data.pointsAdded} نقطة للطالب.\`, "نجاح")
                        } else {
                                await showAlert(data.error || "خطأ في التعويض", "خطأ")
                        }
                } catch (e) {
                        await showAlert("حدث خطأ في النظام", "خطأ")
                }
        }

        const openNotesDialog = (studentId: number) => {`;

code = code.replace(funcSearch, funcToAdd);

// 4. Update UI button (the icon)
const buttonSearch = `<div className="flex items-center gap-2">
                                                                                                                        <p className="text-base font-bold text-[#1a2332]">{student.name}</p>
                                                                                                                        <Button`;

const buttonToAdd = `<div className="flex flex-col gap-2">
                                                                                                                                <p className="text-base font-bold text-[#1a2332]">{student.name}</p>
                                                                                                                                <div className="flex items-center gap-2">
                                                                                                                                        <Button
                                                                                                                                                variant="outline"
                                                                                                                                                onClick={() => openCompDialog(student.id)}
                                                                                                                                                title="تعويض الحفظ"
                                                                                                                                                className="flex-1 h-8 rounded-md border-[#D4AF37]/50 text-neutral-600 transition-all hover:bg-[#D4AF37]/10 flex items-center justify-center gap-1"
                                                                                                                                        >
                                                                                                                                                <RotateCcw className="w-3 h-3" /> <span className="text-[10px]">تعويض</span>
                                                                                                                                        </Button>
                                                                                                                        <Button`;

code = code.replace(buttonSearch, buttonToAdd);

// Don't forget to close the div added above for the flex-col
const endDivSearch = `<MessageSquare className="w-3 h-3" />
                                                                                                                        </Button>
                                                                                                                </div>`;

const endDivAdd = `<MessageSquare className="w-3 h-3" />
                                                                                                                        </Button>
                                                                                                                </div>
                                                                                                                </div>`;

code = code.replace(endDivSearch, endDivAdd);

// 5. Add Dialog Rendering
const dialogRenderSearch = `<Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>`;

const dialogRenderAdd = `
                        <Dialog open={isCompDialogOpen} onOpenChange={setIsCompDialogOpen}>
                                <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto" dir="rtl">
                                        <DialogTitle className="text-xl font-bold text-center text-[#1a2332] mb-4">تعويض الحفظ المعُلّق</DialogTitle>
                                        <div className="space-y-4">
                                                {isCompLoading ? (
                                                        <div className="text-center text-neutral-500 py-6">جاري جلب الأيام المعلقة...</div>
                                                ) : missedDays.length === 0 ? (
                                                        <div className="text-center text-emerald-600 font-bold py-6">لا توجد أيام متأخرة للتعويض بفضل الله!</div>
                                                ) : (
                                                        <div className="space-y-3">
                                                                {missedDays.map((md, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                                                                <div>
                                                                                        <p className="font-semibold text-sm text-[#1a2332] mb-1">تاريخ: {md.date}</p>
                                                                                        <p className="text-xs text-neutral-500">{md.content}</p>
                                                                                </div>
                                                                                <Button 
                                                                                        size="sm" 
                                                                                        onClick={() => handleCompensate(md.date)}
                                                                                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-3 py-1 h-8 text-xs font-bold transition-all shrink-0"
                                                                                >
                                                                                        تم التعويض
                                                                                </Button>
                                                                        </div>
                                                                ))}
                                                        </div>
                                                )}
                                        </div>
                                </DialogContent>
                        </Dialog>

                        <Dialog open={isNotesDialogOpen} onOpenChange={setIsNotesDialogOpen}>`;

code = code.replace(dialogRenderSearch, dialogRenderAdd);

fs.writeFileSync('app/teacher/halaqah/[id]/page.tsx', code);
console.log('Teacher Comp dialog patched.');