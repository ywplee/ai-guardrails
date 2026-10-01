# ai-guardrails

Lint rules and guardrails for LLM-written code: an ESLint config, review-enforced conventions, and a Claude Code plugin, bundled into one package so any project can adopt them in one command.

## Use

```sh
npm install --save-dev github:ywplee/ai-guardrails
npx ai-guardrails init
```

Install it from GitHub as shown. The name `ai-guardrails` on the npm registry belongs to a different, unrelated package, so never run `npx ai-guardrails` or `npm install ai-guardrails` in a project that hasn't installed this repo first. `init` writes an import of `ai-guardrails` into your ESLint config, so whatever package sits at that name runs every time ESLint loads.

This is idempotent, safe to re-run. It will:

- wire the ai-guardrails ESLint config into `eslint.config.js` (creating it if absent, appending to it if not)
- add a one-line pointer to `AGENTS.md` (creating it if absent)
- install the Claude Code plugin (a lint hook plus a guardrails-loading skill) into `.claude/skills/ai-guardrails/`

See [GUARDRAILS.md](GUARDRAILS.md) for the full list of rules and conventions this enforces.
