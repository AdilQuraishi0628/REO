#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");

// 1. Extract icons from registry.tsx
const registryPath = path.join(srcDir, "components", "icons", "registry.tsx");
const registryContent = fs.readFileSync(registryPath, "utf-8");

// Parse keys in ICON_REGISTRY = { ... }
const registryKeys = new Set();
const registryMatch = registryContent.match(/export const ICON_REGISTRY = {([\s\S]*?)} as const;/);
if (registryMatch) {
  const body = registryMatch[1];
  const keyRegex = /(?:^|\n)\s*(?:["']?([a-z0-9-]+)["']?)\s*:\s*\(/g;
  let match;
  while ((match = keyRegex.exec(body)) !== null) {
    registryKeys.add(match[1]);
  }
}

// 2. Extract aliases from aliases.ts
const aliasesPath = path.join(srcDir, "components", "icons", "aliases.ts");
const aliasesContent = fs.readFileSync(aliasesPath, "utf-8");
const aliases = new Map();
const aliasRegex = /["']([a-zA-Z0-9.-]+)["']\s*:\s*["']([a-zA-Z0-9-]+)["']/g;
let aMatch;
while ((aMatch = aliasRegex.exec(aliasesContent)) !== null) {
  aliases.set(aMatch[1], aMatch[2]);
}

// 3. Scan src directory for <Icon name="..." /> and alias usage
const allSourceFiles = [];
function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next") {
        walk(fullPath);
      }
    } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
      allSourceFiles.push(fullPath);
    }
  }
}
walk(srcDir);

const usedIcons = new Map(); // registryKey -> Set of files
const missingIcons = new Map(); // unknownKey -> Set of files


const helperToRegistry = {
  IconCoffee: "coffee",
  IconTea: "tea",
  IconBakery: "bakery",
  IconCakes: "cakes",
  IconLightBites: "light-bites",
  IconPlates: "plates",
  IconCold: "cold",
  IconBowls: "bowls",
  IconBag: "bag",
  IconAdd: "add",
  IconRemove: "remove",
  IconTable: "table",
  IconOrder: "order",
  IconClock: "clock",
  IconServed: "check-circle",
  IconBell: "bell",
  IconSearch: "search",
  IconFilter: "filter",
  IconSettings: "settings",
  IconMenu: "menu",
  IconClose: "close",
  IconBack: "back",
  IconEdit: "edit",
  IconDelete: "delete",
  IconQrCode: "qr",
  IconStaff: "staff",
  IconWifi: "wifi",
  IconStar: "star",
  IconVeg: "veg",
  IconMonogramT: "monogram-t",
  IconBotanicalSprig: "flourish",
};

const literalStringRegex = /<(?:Icon|CategoryIcon)\b[^>]*\bname\s*=\s*(?:["']([a-zA-Z0-9.-]+)["']|\{\s*["']([a-zA-Z0-9.-]+)["']\s*\})|\biconName\s*:\s*["']([a-zA-Z0-9.-]+)["']|\bicon\s*:\s*["']([a-zA-Z0-9.-]+)["']/g;
const helperIconRegex = /<(Icon[A-Z][a-zA-Z0-9]+)\b/g;

for (const file of allSourceFiles) {
  // Skip the icons library folder itself and dev gallery from inflating usage
  const relPath = path.relative(rootDir, file);
  if (
    relPath.includes("components/icons/index.tsx") ||
    relPath.includes("components/icons.tsx") ||
    relPath.includes("app/dev/icons")
  ) {
    continue;
  }

  const content = fs.readFileSync(file, "utf-8");

  // Check literal icon references
  let match;
  while ((match = literalStringRegex.exec(content)) !== null) {
    const rawName = match[1] || match[2] || match[3];
    if (!rawName) continue;

    let resolved = rawName;
    if (aliases.has(rawName)) {
      resolved = aliases.get(rawName);
    }

    if (registryKeys.has(resolved)) {
      if (!usedIcons.has(resolved)) usedIcons.set(resolved, new Set());
      usedIcons.get(resolved).add(relPath);
    } else {
      if (!missingIcons.has(rawName)) missingIcons.set(rawName, new Set());
      missingIcons.get(rawName).add(relPath);
    }
  }

  // Check helper wrappers
  while ((match = helperIconRegex.exec(content)) !== null) {
    const helperName = match[1];
    if (helperToRegistry[helperName]) {
      const resolved = helperToRegistry[helperName];
      if (!usedIcons.has(resolved)) usedIcons.set(resolved, new Set());
      usedIcons.get(resolved).add(relPath);
    }
  }

  // Check CategoryIcon usage -> category icons
  if (content.includes("<CategoryIcon")) {
    // CategoryIcon dynamically resolves coffee, tea, bakery, cakes, light-bites, plates, cold, bowls
    // We mark category resolver as using category icons
    ["coffee", "tea", "bakery", "cakes", "light-bites", "plates", "cold", "bowls"].forEach((cat) => {
      if (!usedIcons.has(cat)) usedIcons.set(cat, new Set());
      usedIcons.get(cat).add(relPath + " (via <CategoryIcon />)");
    });
  }
}

// Separate unused icons
const unusedIcons = [];
for (const regKey of Array.from(registryKeys).sort()) {
  if (!usedIcons.has(regKey)) {
    unusedIcons.push(regKey);
  }
}

console.log("\n=======================================================");
console.log("             TABLETAP ICON SYSTEM AUDIT                ");
console.log("=======================================================\n");

console.log(`Total Icons Registered: ${registryKeys.size}`);
console.log(`Icons Currently in Use: ${usedIcons.size}`);
console.log(`Unused Icons (Preserved for Future): ${unusedIcons.length}`);

if (missingIcons.size > 0) {
  console.log(`\n❌ MISSING ICONS (${missingIcons.size}):`);
  for (const [missing, files] of missingIcons) {
    console.log(`  - "${missing}" used in: ${Array.from(files).join(", ")}`);
  }
} else {
  console.log(`\n✅ No Missing Icon References Found!`);
}

console.log("\n--- ICONS IN ACTIVE USE ---");
for (const [icon, files] of Array.from(usedIcons.entries()).sort()) {
  console.log(`  ✓ ${icon.padEnd(16)} (used in ${files.size} location${files.size > 1 ? "s" : ""})`);
}

console.log("\n--- UNUSED ICONS (PRESERVED FOR FUTURE FEATURES) ---");
console.log(unusedIcons.map((i) => `  • ${i}`).join("\n"));

console.log("\n=======================================================\n");

if (missingIcons.size > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
