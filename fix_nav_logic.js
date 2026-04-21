const fs = require('fs');
let code = fs.readFileSync('components/header.tsx', 'utf8');

const oldLogic = `  const handleNav = (href: string) => {
    setIsMobileMenuOpen(false);
    scrollToTop();
    router.push(href.startsWith('?') ? window.location.pathname + href : href);
  };`;

const newLogic = `  const handleNav = (href: string) => {
    setIsMobileMenuOpen(false);
    scrollToTop();
    if (href.startsWith('?')) {
      const path = window.location.pathname;
      const url = path.includes('/admin/dashboard') ? href : '/admin/dashboard' + href;
      router.push(url);
    } else {
      router.push(href);
    }
  };`;

if (code.includes(oldLogic)) {
    code = code.replace(oldLogic, newLogic);
    fs.writeFileSync('components/header.tsx', code);
    console.log("Fixed handleNav logic!");
} else {
    console.log("Could not find old logic");
}
