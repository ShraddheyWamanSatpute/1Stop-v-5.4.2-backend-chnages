#!/usr/bin/env node

/**
 * Theme codemod for 1Stop
 *
 * Goals:
 * - Remove hardcoded/legacy color strings that cause MUI default blue/pink drift
 * - Replace common "palette string" usages with themeConfig brand colors (navy/offWhite)
 * - Replace rgba(...) overlays with alpha(themeConfig...) for consistency
 * - Remove forced ALL CAPS styling by converting textTransform/text-transform uppercase -> none
 *
 * Scopes:
 * - app/frontend/** (all)
 * - admin/** (frontend + entry points)
 *
 * Excludes:
 * - app/frontend/pages/admin/** (legacy folder)
 * - app/old/**, app/supplierhub/**, node_modules/**
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");

const TARGETS = [
  path.join(ROOT, "app", "frontend"),
  path.join(ROOT, "admin"),
];

const EXTS = new Set([".ts", ".tsx", ".css"]);

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function shouldSkip(absPath) {
  const rel = toPosix(path.relative(ROOT, absPath));
  if (!rel) return true;

  // excludes
  if (rel.startsWith("app/old/")) return true;
  if (rel.startsWith("app/supplierhub/")) return true;
  if (rel.startsWith("app/frontend/pages/admin/")) return true;
  if (rel.includes("/node_modules/")) return true;
  if (rel.includes("/dist/")) return true;
  if (rel.includes("/.vite/")) return true;
  if (rel.includes("/build/")) return true;
  if (rel.includes("/coverage/")) return true;

  // Only target admin frontend + entrypoints; avoid touching admin backend logic.
  if (rel.startsWith("admin/backend/")) return true;
  if (rel.startsWith("admin/functions/")) return true;
  if (rel.startsWith("admin/backend/")) return true;

  return false;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (shouldSkip(p)) continue;
    if (ent.isDirectory()) {
      walk(p, out);
    } else if (ent.isFile()) {
      const ext = path.extname(ent.name);
      if (EXTS.has(ext)) out.push(p);
    }
  }
  return out;
}

function importPathToAppTheme(absFile) {
  const rel = toPosix(path.relative(ROOT, absFile));
  if (rel.startsWith("app/")) {
    // From the file directory to app/
    const parts = rel.split("/");
    const dirParts = parts.slice(0, -1); // remove file
    const afterApp = dirParts.slice(1); // remove "app"
    const ups = afterApp.length;
    const prefix = Array.from({ length: ups }).map(() => "..").join("/");
    return `${prefix}/theme/AppTheme`;
  }
  if (rel.startsWith("admin/")) {
    const parts = rel.split("/");
    const dirParts = parts.slice(0, -1);
    const afterAdmin = dirParts.slice(1);
    const ups = afterAdmin.length;
    const prefix = Array.from({ length: ups }).map(() => "..").join("/");
    return `${prefix}/app/theme/AppTheme`;
  }
  // fallback (shouldn't happen)
  return "../theme/AppTheme";
}

function replaceAllCaps(text) {
  let out = text;
  // TS/JS object styles
  out = out.replace(/textTransform\s*:\s*(['"])uppercase\1/g, "textTransform: 'none'");
  // CSS
  out = out.replace(/text-transform\s*:\s*uppercase\s*;/gi, "text-transform: none;");
  return out;
}

function replaceColorsTs(text) {
  let out = text;

  // Avoid default palette-token strings for critical colors
  out = out.replace(/(['"])primary\.main\1/g, "themeConfig.brandColors.navy");
  out = out.replace(/(['"])primary\.contrastText\1/g, "themeConfig.brandColors.offWhite");
  out = out.replace(/(['"])secondary\.main\1/g, "themeConfig.brandColors.offWhite");
  out = out.replace(/(['"])secondary\.contrastText\1/g, "themeConfig.brandColors.navy");

  // common overlay concat patterns: theme.palette.primary.main + "20"
  out = out.replace(/theme\.palette\.primary\.main\s*\+\s*(['"])20\1/g, "alpha(themeConfig.brandColors.navy, 0.12)");
  out = out.replace(/theme\.palette\.primary\.main\s*\+\s*(['"])30\1/g, "alpha(themeConfig.brandColors.navy, 0.18)");
  out = out.replace(/theme\.palette\.primary\.main\s*\+\s*(['"])40\1/g, "alpha(themeConfig.brandColors.navy, 0.24)");

  // grid overlays
  out = out.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.05\s*\)/g, "alpha(themeConfig.brandColors.navy, 0.05)");

  // white overlays (admin + misc)
  out = out.replace(/rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*(0?\.\d+)\s*\)/g, (_m, a) => {
    const n = Number(a);
    if (Number.isNaN(n)) return _m;
    return `alpha(themeConfig.brandColors.offWhite, ${n})`;
  });

  // "grey.100" and similar (avoid introducing MUI greys)
  out = out.replace(/(['"])grey\.100\1/g, "alpha(themeConfig.brandColors.navy, 0.04)");

  return out;
}

function replaceColorsCss(text) {
  let out = text;
  // Replace key brand hexes and common dividers with CSS vars
  out = out.replace(/#17234e/gi, "var(--brand-navy)");
  out = out.replace(/#f8f9fa/gi, "var(--brand-offWhite)");
  out = out.replace(/rgba\(\s*23\s*,\s*35\s*,\s*78\s*,\s*0\.12\s*\)/gi, "var(--brand-divider)");
  out = out.replace(/rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.05\s*\)/gi, "var(--brand-navy-05)");
  out = out.replace(/text-transform\s*:\s*uppercase\s*;/gi, "text-transform: none;");
  return out;
}

function hasImportNamedFrom(text, moduleName, importName) {
  const re = new RegExp(`import\\s*\\{[^}]*\\b${importName}\\b[^}]*\\}\\s*from\\s*['"]${moduleName}['"]`);
  return re.test(text);
}

function ensureAlphaImport(text) {
  if (!text.includes("alpha(")) return text;
  if (hasImportNamedFrom(text, "@mui/material/styles", "alpha")) return text;

  // If there's an existing named import from @mui/material/styles, add alpha to it.
  const re = /import\s*\{([^}]*)\}\s*from\s*['"]@mui\/material\/styles['"]\s*;?/;
  if (re.test(text)) {
    return text.replace(re, (m, inner) => {
      if (inner.includes("alpha")) return m;
      const next = inner.trim() ? `${inner.trim()}, alpha` : "alpha";
      return `import { ${next} } from "@mui/material/styles";`;
    });
  }

  // Otherwise insert a new import.
  return insertImportAfterUseClient(text, `import { alpha } from "@mui/material/styles";\n`);
}

function ensureThemeConfigImport(text, absFile) {
  if (!text.includes("themeConfig")) return text;
  const has = /import\s*\{\s*themeConfig\s*\}\s*from\s*['"][^'"]*AppTheme['"]/.test(text);
  if (has) return text;

  const impPath = importPathToAppTheme(absFile);
  return insertImportAfterUseClient(text, `import { themeConfig } from "${impPath}";\n`);
}

function insertImportAfterUseClient(text, importLine) {
  // Preserve `"use client"` directive at top if present.
  const lines = text.split(/\r?\n/);
  let i = 0;
  if ((lines[0] || "").trim() === '"use client"' || (lines[0] || "").trim() === "'use client'") {
    i = 1;
    // skip blank line after directive
    if ((lines[1] || "").trim() === "") i = 2;
  }

  // If there are already imports, insert before the first non-import code block following imports.
  // Simple approach: insert at i (after use client) unless it would land inside a block comment.
  lines.splice(i, 0, importLine.trimEnd());
  return lines.join("\n");
}

function processFile(absFile) {
  const ext = path.extname(absFile);
  const before = fs.readFileSync(absFile, "utf8");

  let after = before;
  after = replaceAllCaps(after);
  if (ext === ".css") {
    after = replaceColorsCss(after);
  } else {
    after = replaceColorsTs(after);
    after = ensureAlphaImport(after);
    after = ensureThemeConfigImport(after, absFile);
  }

  if (after !== before) {
    fs.writeFileSync(absFile, after, "utf8");
    return true;
  }
  return false;
}

function main() {
  const files = [];
  for (const t of TARGETS) {
    walk(t, files);
  }

  let changed = 0;
  for (const f of files) {
    if (processFile(f)) changed += 1;
  }

  console.log(`Theme codemod complete. Updated ${changed} file(s).`);
}

main();

