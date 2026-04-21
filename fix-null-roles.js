const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const ADMIN_ARRAY = '["admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"]';
const PATTERN = ADMIN_ARRAY + '.includes(userRole)';
const FIXED = ADMIN_ARRAY + '.includes(userRole || "")';

const PATTERN2 = ADMIN_ARRAY + '.includes(roleLog)';
const FIXED2 = ADMIN_ARRAY + '.includes(roleLog || "")';

walk('.').forEach(f => {
    try {
        let text = fs.readFileSync(f, 'utf8');
        if (text.includes(PATTERN) || text.includes('user.role')) {
            let updated = text;
            updated = updated.replace(new RegExp(PATTERN.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), FIXED);
            // Also fix role comparison patterns where role is string | null
            updated = updated.replace(/\.includes\(userRole\)/g, '.includes(userRole || "")');
            updated = updated.replace(/\.includes\(roleLog\)/g, '.includes(roleLog || "")');
            if (updated !== text) {
                fs.writeFileSync(f, updated, 'utf8');
                console.log('Fixed:', f);
            }
        }
    } catch(e) {}
});
console.log('Done');
