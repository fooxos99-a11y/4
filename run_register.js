const fs = require('fs');
let code = fs.readFileSync('components/global-admin-modals.tsx', 'utf8');

const importAdmins = 'import { GlobalAdminsDialog } from "./admin-modals/global-admins-dialog"\n';
const importCircles = 'import { GlobalCirclesDialog } from "./admin-modals/global-circles-dialog"\n';

if(!code.includes('GlobalAdminsDialog')) {
    code = importAdmins + importCircles + code;
}

code = code.replace("{action === 'teachers' && <GlobalTeachersDialog />}", "{action === 'teachers' && <GlobalTeachersDialog />}\n      {action === 'circles' && <GlobalCirclesDialog />}\n      {action === 'admins' && <GlobalAdminsDialog />}");

fs.writeFileSync('components/global-admin-modals.tsx', code);