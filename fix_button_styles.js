const fs = require('fs');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { results = results.concat(walk(file)); } 
        else { if (file.endsWith('.tsx')) { results.push(file); } }
    });
    return results;
}

let replaced = 0;
const files = walk('components/admin-modals').concat(walk('app/admin'));

for (let file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Remove any /10, /20 from solid background gold
    content = content.replace(/bg-\[#D4AF37\]\/\d+/g, 'bg-[#D4AF37]');
    
    // Fix transparent gold text to white when background is gold
    content = content.replace(/bg-\[#D4AF37\]([^\"]*?)text-\[#D4AF37\]/g, 'bg-[#D4AF37]$1text-white');
    content = content.replace(/text-\[#D4AF37\]([^\"]*?)bg-\[#D4AF37\]/g, 'text-white$1bg-[#D4AF37]');
    
    // Convert outline buttons with gold text/border to fully solid gold
    content = content.replace(/variant=[\"\']outline[\"\']\s+className=[\"\']([^\"\']*?)border-\[#D4AF37\]([^\"\']*?)text-\[#D4AF37\]([^\"\']*?)[\"\']/g, 'className=\"$1 text-white bg-[#D4AF37] hover:bg-[#D4AF37]/90 border-transparent $2 $3\"');
    content = content.replace(/variant=[\"\']outline[\"\']\s+className=[\"\']([^\"\']*?)text-\[#D4AF37\]([^\"\']*?)[\"\']/g, 'className=\"$1 text-white bg-[#D4AF37] hover:bg-[#D4AF37]/90 border-transparent $2\"');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        replaced++;
    }
}
console.log('Fixed buttons in ' + replaced + ' files.');
