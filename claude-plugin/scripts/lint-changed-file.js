#!/usr/bin/env node
"use strict";

const path = require("path");

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const filePath = input.tool_input && input.tool_input.file_path;
  if (!filePath || !/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(filePath)) {
    process.exit(0);
  }

  const cwd = input.cwd || process.cwd();
  const resolvedPath = path.resolve(cwd, filePath);
  if (resolvedPath !== cwd && !resolvedPath.startsWith(cwd + path.sep)) {
    // File lives outside the project directory; nothing to lint.
    process.exit(0);
  }

  let guardrailsConfigPath;
  try {
    guardrailsConfigPath = require.resolve("ai-guardrails/eslint-config", { paths: [cwd] });
  } catch {
    // ai-guardrails isn't installed in the consuming project; nothing to lint.
    process.exit(0);
  }
  const guardrailsConfig = require(guardrailsConfigPath);

  // Resolve eslint starting from ai-guardrails's own directory, not just cwd:
  // npm doesn't always hoist a dependency's dependencies to the top-level
  // node_modules (e.g. when the consuming project has a conflicting eslint
  // version), in which case eslint only exists nested under
  // node_modules/ai-guardrails/node_modules/eslint.
  let ESLint;
  try {
    const guardrailsDir = path.dirname(guardrailsConfigPath);
    ({ ESLint } = require(require.resolve("eslint", { paths: [guardrailsDir, cwd] })));
  } catch {
    process.exit(0);
  }

  const eslint = new ESLint({
    cwd,
    overrideConfigFile: true,
    overrideConfig: guardrailsConfig,
  });

  let results;
  try {
    results = await eslint.lintFiles([resolvedPath]);
  } catch (err) {
    process.stderr.write(`ai-guardrails lint hook failed: ${err.message}\n`);
    process.exit(1);
  }

  const messages = results.flatMap((result) =>
    result.messages.map(
      (m) => `${filePath}:${m.line}:${m.column} ${m.ruleId || ""} ${m.message}`
    )
  );

  if (messages.length === 0) {
    process.exit(0);
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: `ai-guardrails lint findings for ${filePath}:\n${messages.join("\n")}`,
      },
    })
  );
  process.exit(0);
}

main();
