const fs = require('fs');
const path = require('path');

const ADMIN_ROLES = '["admin", "مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"]';

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Replace strict equality
    content = content.replace(/userRole\s*===\s*(["'])admin\1/g, `${ADMIN_ROLES}.includes(userRole)`);
    content = content.replace(/role\s*===\s*(["'])admin\1/g, `${ADMIN_ROLES}.includes(role)`);
    
    // Replace strict inequality
    content = content.replace(/userRole\s*!==\s*(["'])admin\1/g, `!${ADMIN_ROLES}.includes(userRole)`);
    content = content.replace(/role\s*!==\s*(["'])admin\1/g, `!${ADMIN_ROLES}.includes(role)`);

    // Only for admin check inside conditional maps
    content = content.replace(/currentUser\.role\s*===\s*(["'])admin\1/g, `${ADMIN_ROLES}.includes(currentUser.role)`);
    content = content.replace(/currentUser\.role\s*!==\s*(["'])admin\1/g, `!${ADMIN_ROLES}.includes(currentUser.role)`);

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated', filePath);
    }
}

function walk(dir) {
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) { 
            walk(file);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            processFile(file);
        }
    });
}

walk('.');
