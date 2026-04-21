const fs = require('fs');
let code = fs.readFileSync('components/header.tsx', 'utf8');

const regex = /const handleNav = \(href: string\) => \{[\s\S]*?router\.push\(href\);\s*\};/;

const newNav = `const handleNav = (href: string) => {
    setIsMobileMenuOpen(false);
    scrollToTop();

    if (href.startsWith('?')) {
        const dashboardOnlyActions = ['add-student', 'remove-student', 'transfer-student', 'edit-student', 'edit-points'];
        const action = href.split('=')[1];
        
        if (dashboardOnlyActions.includes(action) && window.location.pathname !== '/admin/dashboard') {
            router.push('/admin/dashboard' + href);
        } else {
            router.push(window.location.pathname + href);
        }
    } else {
        router.push(href);
    }
  };`;

code = code.replace(regex, newNav);
fs.writeFileSync('components/header.tsx', code);
console.log('Fixed handleNav directly');