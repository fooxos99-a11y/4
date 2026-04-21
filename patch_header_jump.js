const fs = require('fs');
let txt = fs.readFileSync('components/header.tsx', 'utf8');

txt = txt.replace(
`const handleNav = (href: string) => {
    setIsMobileMenuOpen(false);

    scrollToTop();

    router.push(href);
  };`,
`const handleNav = (href: string) => {
    setIsMobileMenuOpen(false);

    if (typeof window !== "undefined") {
      // Manage pseudo-links for dashboard modals without navigation jumps
      const url = new URL(href, window.location.origin);
      if (url.pathname === window.location.pathname) {
        // Just append query params without full navigation/scroll
        router.push(href, { scroll: false });
      } else {
        scrollToTop();
        router.push(href);
      }
    } else {
      router.push(href);
    }
  };`
);

fs.writeFileSync('components/header.tsx', txt);
