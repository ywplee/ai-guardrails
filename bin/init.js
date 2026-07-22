#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const CWD = process.cwd();

const AGENTS_MD_LINE =
  "This project uses ai-guardrails. Read its GUARDRAILS.md before writing code.";

function summaryLine(status, message) {
  console.log(`  [${status}] ${message}`);
}

function isEsmProject() {
  const pkgPath = path.join(CWD, "package.json");
  if (!fs.existsSync(pkgPath)) return false;
  try {
    return JSON.parse(fs.readFileSync(pkgPath, "utf8")).type === "module";
  } catch {
    return false;
  }
}

// eslint.config.mjs/.cjs are always unambiguous; a plain eslint.config.js is
// interpreted as ESM or CJS based on the project's package.json "type" field.
function findExistingConfigPath() {
  for (const name of ["eslint.config.js", "eslint.config.mjs", "eslint.config.cjs"]) {
    const candidate = path.join(CWD, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

// ESLint 9 also accepts a TypeScript config file. We can't safely splice
// TS syntax, and creating eslint.config.js alongside it would silently
// shadow it (ESLint resolves .js before .ts), so just detect it and bail.
function findExistingTsConfigPath() {
  for (const name of ["eslint.config.ts", "eslint.config.mts", "eslint.config.cts"]) {
    const candidate = path.join(CWD, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function ensureEslintConfig() {
  const existingTsPath = findExistingTsConfigPath();
  if (existingTsPath) {
    summaryLine(
      "manual-wiring-needed",
      `${path.basename(existingTsPath)}: TypeScript ESLint configs aren't spliced automatically - add "...guardrails" to your exported config yourself`
    );
    return;
  }

  const existingPath = findExistingConfigPath();
  const esm = isEsmProject();

  if (!existingPath) {
    const configPath = path.join(CWD, "eslint.config.js");
    const contents = esm
      ? 'import guardrails from "ai-guardrails";\n\nexport default [...guardrails];\n'
      : 'const guardrails = require("ai-guardrails");\n\nmodule.exports = [...guardrails];\n';
    fs.writeFileSync(configPath, contents);
    summaryLine("created", `${path.basename(configPath)} with ai-guardrails wired in`);
    return;
  }

  const existing = fs.readFileSync(existingPath, "utf8");
  const fileName = path.basename(existingPath);
  if (existing.includes("ai-guardrails")) {
    summaryLine("present", `${fileName} already references ai-guardrails`);
    return;
  }

  const usesEsm = /export\s+default/.test(existing) || existingPath.endsWith(".mjs");
  const importLine = usesEsm
    ? 'import guardrails from "ai-guardrails";\n'
    : 'const guardrails = require("ai-guardrails");\n';

  // Matches `export default [` / `module.exports = [` (a plain array literal),
  // or `export default someName.config(` / `module.exports = someName.config(`
  // (a config-builder call like tseslint.config(...), which flattens spread
  // entries the same way an array does). Anything else - a bare variable
  // reference, a require()/import of another module, a function that isn't
  // named `.config(` - isn't confidently spliceable, so we refuse to touch it
  // rather than silently wiring in nothing while reporting success.
  const exportPrefix = usesEsm ? "export\\s+default\\s*" : "module\\.exports\\s*=\\s*";
  const spliceTarget = new RegExp(`${exportPrefix}(\\[|[\\w.]*\\.config\\()`);
  const match = existing.match(spliceTarget);

  if (!match) {
    summaryLine(
      "manual-wiring-needed",
      `${fileName}: couldn't confidently splice ai-guardrails into this config shape - add "...guardrails" to your exported config yourself`
    );
    return;
  }

  const spliceIndex = match.index + match[0].length;
  const updated =
    importLine +
    existing.slice(0, spliceIndex) +
    "...guardrails, " +
    existing.slice(spliceIndex);
  fs.writeFileSync(existingPath, updated);
  summaryLine("updated", `${fileName}: added ai-guardrails to the existing config`);
}

function ensureAgentsMd() {
  const agentsPath = path.join(CWD, "AGENTS.md");

  if (!fs.existsSync(agentsPath)) {
    fs.writeFileSync(agentsPath, `# AGENTS.md\n\n${AGENTS_MD_LINE}\n`);
    summaryLine("created", "AGENTS.md with the ai-guardrails pointer");
    return;
  }

  const existing = fs.readFileSync(agentsPath, "utf8");
  if (existing.includes(AGENTS_MD_LINE)) {
    summaryLine("present", "AGENTS.md already has the ai-guardrails pointer");
    return;
  }

  const separator = existing.endsWith("\n") ? "\n" : "\n\n";
  fs.writeFileSync(agentsPath, `${existing}${separator}${AGENTS_MD_LINE}\n`);
  summaryLine("updated", "AGENTS.md: appended the ai-guardrails pointer");
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function ensureClaudePlugin() {
  const src = path.join(PACKAGE_ROOT, "claude-plugin");
  const dest = path.join(CWD, ".claude", "skills", "ai-guardrails");
  const existed = fs.existsSync(dest);

  copyRecursive(src, dest);
  summaryLine(
    existed ? "updated" : "created",
    ".claude/skills/ai-guardrails/ (Claude Code plugin: lint hook + guardrails skill)"
  );
}

function main() {
  console.log("ai-guardrails init\n");
  ensureEslintConfig();
  ensureAgentsMd();
  ensureClaudePlugin();
  console.log("\nDone. Re-run any time; this is idempotent.");
}

main();
