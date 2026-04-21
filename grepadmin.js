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
walk('.').forEach(f => {
    try {
        const text = fs.readFileSync(f, 'utf8');
        if (text.includes('"admin"') || text.includes("'admin'")) {
            console.log(f);
        }
    } catch(e) {}
});