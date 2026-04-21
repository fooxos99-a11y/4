const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "components", "header.tsx");
let content = fs.readFileSync(filePath, "utf8");

// ─────────────────────────────────────────────────────────────
// 1. Replace NavItem component
// ─────────────────────────────────────────────────────────────
const navItemStart = content.indexOf("function NavItem({");
const navItemEnd = content.indexOf("\nfunction SectionHeader(");
const newNavItem = `function NavItem({
  icon: Icon,
  label,
  onClick,
  gold,
  indent,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  gold?: boolean;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative
        \${indent ? "pr-8" : ""}
        \${gold ? "text-[#b5862c] hover:bg-[#d8a355]/12" : "text-[#1a2e2b] hover:bg-[#00312e]/7"}\`}
    >
      <span
        className={\`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200
          \${gold ? "bg-[#d8a355]/18 text-[#d8a355] group-hover:bg-[#d8a355]/30 group-hover:scale-110" : "bg-[#00312e]/7 text-[#00312e]/70 group-hover:bg-[#00312e]/14 group-hover:text-[#00312e] group-hover:scale-110"}\`}
      >
        <Icon size={15} />
      </span>
      <span className="flex-1 text-right leading-tight">{label}</span>
      <ChevronLeft
        size={13}
        className={\`flex-shrink-0 transition-all duration-200 opacity-0 group-hover:opacity-40 group-hover:-translate-x-0.5
          \${gold ? "text-[#d8a355]" : "text-[#00312e]"}\`}
      />
    </button>
  );
}
`;

// ─────────────────────────────────────────────────────────────
// 2. Replace SectionHeader component
// ─────────────────────────────────────────────────────────────
const sectionHeaderStart = content.indexOf("function SectionHeader(");
const sectionHeaderEnd = content.indexOf("\nfunction CollapseSection(");
const newSectionHeader = `function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-4 pt-5 pb-1.5">
      <p className="text-[9px] font-black tracking-[0.2em] text-[#00312e]/35 uppercase">
        {title}
      </p>
    </div>
  );
}
`;

// ─────────────────────────────────────────────────────────────
// 3. Replace CollapseSection component
// ─────────────────────────────────────────────────────────────
const collapseSectionStart = content.indexOf("function CollapseSection(");
const collapseSectionEnd = content.indexOf("\nexport function Header()");
const newCollapseSection = `function CollapseSection({
  icon: Icon,
  label,
  isOpen,
  onToggle,
  children,
}: {
  icon: React.ElementType;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-1 mb-0.5">
      <button
        onClick={onToggle}
        className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group
          \${isOpen ? "bg-[#00312e]/7 text-[#00312e]" : "text-[#1a2e2b] hover:bg-[#00312e]/7"}\`}
      >
        <span className={\`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200
          \${isOpen ? "bg-[#00312e]/15 text-[#00312e] scale-110" : "bg-[#00312e]/7 text-[#00312e]/70 group-hover:bg-[#00312e]/14 group-hover:scale-110"}\`}>
          <Icon size={15} />
        </span>
        <span className="flex-1 text-right leading-tight">{label}</span>
        <ChevronDown
          size={14}
          className={\`flex-shrink-0 transition-transform duration-300 \${isOpen ? "rotate-180 opacity-70" : "opacity-35"}\`}
        />
      </button>
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="pt-0.5 pb-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
`;

// Build new content
content =
  content.substring(0, navItemStart) +
  newNavItem +
  newSectionHeader +
  newCollapseSection +
  content.substring(collapseSectionEnd);

// ─────────────────────────────────────────────────────────────
// 4. Replace drawer bg-white → bg-[#f9fafb]
// ─────────────────────────────────────────────────────────────
content = content.replace(
  /w-\[300px\] bg-white z-\[90\]/,
  "w-[300px] bg-[#f9fafb] z-[90]"
);

// ─────────────────────────────────────────────────────────────
// 5. Fix close button styling in drawer header
// ─────────────────────────────────────────────────────────────
content = content.replace(
  /className="absolute left-0 flex items-center justify-center transition-colors"/,
  'className="absolute left-0 w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 active:scale-90"'
);
content = content.replace(
  /<Menu size={18} className="text-white" \/>/,
  '<Menu size={17} className="text-white/80" />'
);

// ─────────────────────────────────────────────────────────────
// 6. Remove all "mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1"
//    wrappers → replace with "px-2 mb-2"
// ─────────────────────────────────────────────────────────────
// Navigation section
content = content.replace(
  /<div className="mx-3 rounded-xl overflow-hidden border border-\[#00312e\]\/8 mb-1">\s*\n(\s*<NavItem\s[\s\S]*?icon=\{Home\})/,
  '<div className="px-2 mb-2">\n$1'
);

// Student section  
content = content.replace(
  /منطقتي.*?<div className="mx-3 rounded-xl overflow-hidden border border-\[#00312e\]\/8 mb-1">/s,
  (m) => m.replace('mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1', 'px-2 mb-2')
);

// Teacher section
content = content.replace(
  /أدواتي.*?<div className="mx-3 rounded-xl overflow-hidden border border-\[#00312e\]\/8 mb-1">/s,
  (m) => m.replace('mx-3 rounded-xl overflow-hidden border border-[#00312e]/8 mb-1', 'px-2 mb-2')
);

// Collapse section wrapper for students/circles ranking
content = content.replace(
  /<div className="mx-3 rounded-xl overflow-hidden border border-\[#00312e\]\/8 mb-1">\s*\n(\s*<CollapseSection[\s\S]*?label="\u0623\u0641\u0636\u0644)/,
  '<div className="px-2 mb-2">\n$1'
);

// Admin dashboard gold border
content = content.replace(
  'mx-3 rounded-xl overflow-hidden border border-[#d8a355]/30 mb-1',
  'px-2 mb-1'
);

// All remaining admin section borders
let adminCount = 0;
content = content.replace(
  /mx-3 rounded-xl overflow-hidden border border-\[#00312e\]\/8 mb-1/g,
  () => {
    adminCount++;
    return 'px-2 mb-0.5';
  }
);

// ─────────────────────────────────────────────────────────────
// 7. Logout button - remove border wrapper
// ─────────────────────────────────────────────────────────────
content = content.replace(
  'mx-3 mt-2 mb-6 rounded-xl overflow-hidden border border-red-100',
  'px-3 mt-3 mb-6'
);
content = content.replace(
  'w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors',
  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-all duration-200 group'
);
content = content.replace(
  'w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0',
  'w-8 h-8 rounded-lg bg-red-50 group-hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110'
);
content = content.replace(
  '<LogOut size={16} className="text-red-500" />',
  '<LogOut size={15} className="text-red-400" />'
);

// ─────────────────────────────────────────────────────────────
// 8. Content area background
// ─────────────────────────────────────────────────────────────
content = content.replace(
  'className="flex-1 overflow-y-auto bg-white"',
  'className="flex-1 overflow-y-auto bg-[#f9fafb]"'
);

fs.writeFileSync(filePath, content, "utf8");
console.log("✅ Drawer redesigned successfully!");
