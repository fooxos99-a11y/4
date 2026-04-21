const fs = require('fs');
let code = fs.readFileSync('components/admin-modals/global-teachers-dialog.tsx', 'utf8');

if (!code.includes('const [isOpen, setIsOpen]')) {
  code = code.replace(/const \[isLoading, setIsLoading\] = useState\(true\)/, 'const [isLoading, setIsLoading] = useState(true)\n  const [isOpen, setIsOpen] = useState(true)\n  const handleClose = (open: boolean) => { if(!open) { setIsOpen(false); setTimeout(() => router.push("?"), 300) } }');
}

const idx = code.indexOf('return (');
if (idx !== -1) {
  let newReturn = `return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl p-0 overflow-hidden [&>button]:top-4 [&>button]:right-4 [&>button]:left-auto" dir="rtl">
        <DialogHeader className="px-6 py-5 border-b border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/8 to-transparent text-right">
          <DialogTitle className="text-lg font-bold text-[#1a2332] flex items-center gap-2 pr-8">
            <span className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              <Settings className="w-4 h-4" />
            </span>
            إدارة المعلمين
          </DialogTitle>
          <div className="absolute left-6 top-5">
            <Button onClick={() => router.push('?action=add-teacher')} className="bg-[#D4AF37] hover:bg-[#B4952F] text-white gap-2">
              <UserPlus className="w-4 h-4" />
              إضافة معلم جديد
            </Button>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {isLoadingData ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D4AF37]"></div>
            </div>
          ) : (
            <div className="space-y-3">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="flex items-center justify-between p-4 bg-white border border-[#D4AF37]/20 rounded-xl hover:border-[#D4AF37]/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#1a2332]/5 flex items-center justify-center text-[#1a2332]">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1a2332] text-sm">{teacher.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                        <span className="bg-[#1a2332]/5 px-2 py-0.5 rounded-full">{teacher.halaqah}</span>
                        <span className="bg-[#D4AF37]/10 text-[#D4AF37] px-2 py-0.5 rounded-full">
                          {teacher.role === 'deputy' ? 'نائب معلم' : 'معلم'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => {}} className="h-8 border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 text-[#D4AF37]">
                      <Edit2 className="w-3.5 h-3.5 ml-1" />
                      تعديل
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteTeacher(teacher.id)} className="h-8 border-red-200 hover:bg-red-50 text-red-600">
                      <Trash2 className="w-3.5 h-3.5 ml-1" />
                      إزالة
                    </Button>
                  </div>
                </div>
              ))}
              {teachers.length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>لا يوجد معلمين حالياً</p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
`;
  code = code.substring(0, idx) + newReturn;
  fs.writeFileSync('components/admin-modals/global-teachers-dialog.tsx', code);
  console.log("Updated components/admin-modals/global-teachers-dialog.tsx successfully.");
} else {
  console.log("Could not find 'return ('");
}
