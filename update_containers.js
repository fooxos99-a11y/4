const fs = require('fs');

function updateComponent(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let code = fs.readFileSync(filePath, 'utf8');
    for (let r of replacements) {
        code = code.replace(r.from, r.to);
    }
    fs.writeFileSync(filePath, code);
    console.log(`Updated ${filePath}`);
}

const containerStyleFrom = /rounded-md border bg-popover text-popover-foreground shadow-md/g;
const containerStyleTo = "rounded-xl border border-neutral-100 bg-white text-slate-800 shadow-lg";

// 1. Dropdown Menu
updateComponent('components/ui/dropdown-menu.tsx', [
    { from: containerStyleFrom, to: containerStyleTo },
    { from: /rounded-sm/g, to: "rounded-lg" } // Update item rounding
]);

// 2. Popover
updateComponent('components/ui/popover.tsx', [
    { from: containerStyleFrom, to: containerStyleTo }
]);

// 3. Command
updateComponent('components/ui/command.tsx', [
    { from: /bg-popover text-popover-foreground flex h-full w-full flex-col overflow-hidden rounded-md/g, to: "bg-white text-slate-800 flex h-full w-full flex-col overflow-hidden rounded-xl" },
    { from: /rounded-sm/g, to: "rounded-lg" }
]);

// 4. Alert Dialog
updateComponent('components/ui/alert-dialog.tsx', [
    { from: /bg-background/g, to: "bg-white" },
    { from: /rounded-lg/g, to: "rounded-2xl shadow-xl border-neutral-100" },
    { from: /sm:rounded-lg/g, to: "sm:rounded-2xl" }
]);

