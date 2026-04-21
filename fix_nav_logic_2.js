const fs = require('fs');
let code = fs.readFileSync('components/header.tsx', 'utf8');

const regex = /const handleNav = \(href: string\) => \{[\s\S]*?router\.push\([^)]+\);?\s*\n\s*\};/;

const newLogic = `const handleNav = (href: string) => {
    setIsMobileMenuOpen(false);
    scrollToTop();
    if (href.startsWith('?')) {
      const p = window.location.pathname;
      const url = p.includes('/admin/dashboard') ? p + href : '/admin/dashboard' + href;
      router.push(url);
    } else {
      router.push(href);
    }
  };`;

if (regex.test(code)) {
    code = code.replace(regex, newLogic);
    fs.writeFileSync('components/header.tsx', code);
    console.log("Replaced using regex");
} else {
    console.log("Could not match regex");
}