const fs = require('fs');
let code = fs.readFileSync('app/teacher/halaqah/[id]/page.tsx', 'utf8');

const searchStr = `<div className="flex items-center gap-2">
                                                                                                                        <p className="text-base font-bold text-[#1a2332]">{student.name}</p>
                                                                                                                        <Button
                                                                                                                                variant="outline"
                                                                                                                                onClick={() => openNotesDialog(student.id)}
                                                                                                                                title="الملاحظات"
                                                                                                                                className={\`h-5 w-5 rounded-md p-0 transition-all flex-shrink-0 \${
                                                                                                                                        student.notes
                                                                                                                                                ? "bg-[#D4AF37]/20 border-[#D4AF37] text-neutral-800"
                                                                                                                                                : "border-[#D4AF37]/80 text-neutral-600"
                                                                                                                                }
                                                                                                                                \`}
                                                                                                                        >
                                                                                                                                <MessageSquare className="w-3 h-3" />
                                                                                                                        </Button>
                                                                                                                </div>`;

const replacement = `<div className="flex flex-col gap-2">
                                                                                                                        <div className="flex items-center gap-2">
                                                                                                                                <p className="text-base font-bold text-[#1a2332]">{student.name}</p>
                                                                                                                                <Button
                                                                                                                                        variant="outline"
                                                                                                                                        onClick={() => openNotesDialog(student.id)}
                                                                                                                                        title="الملاحظات"
                                                                                                                                        className={\`h-5 w-5 rounded-md p-0 transition-all flex-shrink-0 \${
                                                                                                                                                student.notes
                                                                                                                                                        ? "bg-[#D4AF37]/20 border-[#D4AF37] text-neutral-800"
                                                                                                                                                        : "border-[#D4AF37]/80 text-neutral-600"
                                                                                                                                        }\`}
                                                                                                                                >
                                                                                                                                        <MessageSquare className="w-3 h-3" />
                                                                                                                                </Button>
                                                                                                                                <Button
                                                                                                                                        variant="outline"
                                                                                                                                        onClick={() => openCompDialog(student.id)}
                                                                                                                                        title="تعويض الحفظ"
                                                                                                                                        className="h-5 w-5 rounded-md p-0 border-[#D4AF37]/80 text-neutral-600 transition-all flex-shrink-0 hover:bg-[#D4AF37]/10"
                                                                                                                                >
                                                                                                                                        <RotateCcw className="w-3 h-3" />
                                                                                                                                </Button>
                                                                                                                        </div>
                                                                                                                </div>`;

const searchRegex = /<div className="flex items-center gap-2">[\s\S]*?<MessageSquare className="w-3 h-3" \/>\s*<\/Button>\s*<\/div>/;

if (searchRegex.test(code)) {
    code = code.replace(searchRegex, replacement);
    fs.writeFileSync('app/teacher/halaqah/[id]/page.tsx', code);
    console.log("Button perfectly patched.");
} else {
    console.log("Could not find the target string.");
}
