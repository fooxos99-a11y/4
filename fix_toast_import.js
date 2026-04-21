const fs = require('fs');
let c = fs.readFileSync('components/global-add-student-dialog.tsx', 'utf8');
c = c.replace('import { toast } from "@/components/ui/use-toast"', 'import { toast } from "@/hooks/use-toast"');
fs.writeFileSync('components/global-add-student-dialog.tsx', c);
console.log('Fixed toast import');
