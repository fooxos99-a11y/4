const fs = require('fs');
let c = fs.readFileSync('components/header.tsx', 'utf8');

if (!c.includes('GlobalAddStudentDialog')) {
    c = c.replace(
        'import { Button } from "@/components/ui/button"',
        'import { Button } from "@/components/ui/button"\nimport { GlobalAddStudentDialog } from "@/components/global-add-student-dialog"'
    );
    c = c.replace(
        '</header>',
        '  <GlobalAddStudentDialog />\n    </header>'
    );
    fs.writeFileSync('components/header.tsx', c);
    console.log('Injected');
} else {
    console.log('Already injected');
}
