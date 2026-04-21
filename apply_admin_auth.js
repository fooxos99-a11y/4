const fs = require("fs");
const path = require("path");

const adminPagesDir = path.join(__dirname, "app", "admin");

// Collect all page.tsx files under app/admin
function findPages(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findPages(full));
    } else if (entry.name === "page.tsx") {
      results.push(full);
    }
  }
  return results;
}

const pages = findPages(adminPagesDir);
let modified = 0;
let skipped = 0;

for (const filePath of pages) {
  let content = fs.readFileSync(filePath, "utf8");

  // Skip if already has useAdminAuth
  if (content.includes("useAdminAuth")) {
    console.log(`⏭  Already has hook: ${filePath.split("app\\admin\\")[1]}`);
    skipped++;
    continue;
  }

  // 1. Add import — insert after the last "import" block
  //    Find the last import line
  const lines = content.split("\n");
  let lastImportIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("import ")) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex === -1) {
    console.log(`⚠  No imports found: ${filePath}`);
    skipped++;
    continue;
  }

  // Insert useAdminAuth import after last import
  lines.splice(
    lastImportIndex + 1,
    0,
    `import { useAdminAuth } from "@/hooks/use-admin-auth"`
  );

  content = lines.join("\n");

  // 2. Add hook call inside the default exported function
  //    Find "export default function" and insert useAdminAuth() after the first {
  const exportFnMatch = content.match(
    /export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{/
  );
  if (!exportFnMatch) {
    console.log(`⚠  No default export function found: ${filePath}`);
    skipped++;
    continue;
  }

  const insertPos =
    content.indexOf(exportFnMatch[0]) + exportFnMatch[0].length;

  const hookCall = `\n  useAdminAuth();\n`;
  content =
    content.substring(0, insertPos) + hookCall + content.substring(insertPos);

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Updated: ${filePath.split("app\\admin\\")[1]}`);
  modified++;
}

console.log(`\nDone! Modified: ${modified}, Skipped: ${skipped}`);
