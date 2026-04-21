const fs = require('fs');

let code = fs.readFileSync('app/admin/dashboard/page.tsx', 'utf8');

const mapping = [
    { state: 'isBulkAddStudentDialogOpen', action: 'bulk-add' },
    { state: 'isRemoveStudentDialogOpen', action: 'remove-student' },
    { state: 'isMoveStudentDialogOpen', action: 'transfer-student' },
    { state: 'isEditStudentDialogOpen', action: 'edit-student' },
    { state: 'isEditPointsDialogOpen', action: 'edit-points' },
    { state: 'isStudentRecordsDialogOpen', action: 'student-records' },
];

let newCode = code;

mapping.forEach(m => {
    const setterName = 'setI' + m.state.slice(1);
    
    // Replace the opening trigger where setter(true) is called
    const regex1 = new RegExp(setterName + '\\(true\\)', 'g');
    newCode = newCode.replace(regex1, `router.push('/admin/dashboard?action=${m.action}')`);
    
    // Also remove the `if (action === "...") setIs...(true)` from useEffect
    const regex2 = new RegExp(`if \\(action === "${m.action}"\\) .*?\n`, 'g');
    newCode = newCode.replace(regex2, '');
    
    // Delete the state variables `const [is..., setIs...] = useState(false)`
    const regex3 = new RegExp(`const \\[${m.state}.*?\n`, 'g');
    newCode = newCode.replace(regex3, '');

    // The Dialog element <Dialog open={is...}>...</Dialog>
    // This is tricky because it might span multiple lines and contain nested Dialogs...
    // Let's do a simple regex assuming the dialog tag starts at the line and ends with </Dialog> 
});

// Since regex is hard for nested matched tags, let's just make the state effectively dead or strip the component using replace.
// Actually, it's easier to rip out the Dialog by looking for its start and its ending tag.
mapping.forEach(m => {
    let startIndex = newCode.indexOf(`<Dialog open={${m.state}}`);
    if (startIndex !== -1) {
        let endIndex = newCode.indexOf('</Dialog>', startIndex);
        if (endIndex !== -1) {
            newCode = newCode.slice(0, startIndex) + newCode.slice(endIndex + 9);
        }
    }
});

fs.writeFileSync('app/admin/dashboard/page.tsx', newCode);
console.log('Cleaned up page.tsx!');
