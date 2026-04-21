const fs = require('fs');
let code = fs.readFileSync('app/admin/admins/page.tsx', 'utf8');

code = code.replace(/export default function AdminsManagement/, 'export function GlobalAdminsDialog');

code = code.replace(
  /const \[isLoading, setIsLoading\] = useState\(true\)/,
  'const [isLoading, setIsLoading] = useState(true); const [isOpen, setIsOpen] = useState(true); const handleClose = (open) => { if(!open) { setIsOpen(false); setTimeout(() => router.push(window.location.pathname), 300) } }'
);

code = code.replace(/if \(isLoading \|\| authLoading \|\| !authVerified\) \{\s+return \([\s\S]*?<\/div>\s*\)\s*\}/, 'if (isLoading || authLoading || !authVerified) { return null; }');

let parts = code.split(/return \(\s*<div className=\"min-h-screen bg-\[\#0b1120\] flex flex-col font-cairo\" dir=\"rtl\">\s*<Header \/>\s*<main className=\"flex-1 py-12 px-4 sm:px-6 lg:px-8\">\s*<div className=\"max-w-7xl mx-auto\">/);

if(parts.length > 1) {
    let replaceStart = 'return ( <Dialog open={isOpen} onOpenChange={handleClose}> <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl p-0 [&>button]:top-4 [&>button]:right-4 [&>button]:left-auto" dir="rtl"> <DialogHeader className="px-6 py-5 border-b border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/8 to-transparent text-right"> <DialogTitle className="text-lg font-bold text-[#1a2332] flex items-center gap-2 pr-8"> الهيكل الإداري </DialogTitle> </DialogHeader> <div className="px-6 py-5">';
    code = parts[0] + replaceStart + parts[1];
}

code = code.replace(/<\/div>\s*<\/main>\s*<Footer \/>\s*<\/div>\s*\)\s*\}$/g, '</div> </DialogContent> </Dialog> )}');

fs.writeFileSync('components/admin-modals/global-admins-dialog.tsx', code);
console.log('Admins Done');