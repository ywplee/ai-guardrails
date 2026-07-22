# ai-guardrails

Sensible lint rules and guardrails for LLM-written code, meant to be dropped into any project.
Three layers: rules an ESLint config enforces automatically, code-level conventions no linter can check, and agent workflow discipline for how the work itself gets done.

## Install

```sh
npx ai-guardrails init
```

See the [README](README.md) for what `init` does.

## Lint-enforced (automatic, 17 core rules + 1 Node-specific + 1 optional per test framework)

**Complexity** - keep functions small and flat.
- `complexity` - caps branches per function
- `max-depth` - caps nesting depth
- `max-lines-per-function` - caps function length

**Type safety**
- `@typescript-eslint/no-explicit-any` - no `any`, use a real type or `unknown`
- `@typescript-eslint/ban-ts-comment` - no `@ts-ignore`/`@ts-nocheck`; use `@ts-expect-error` with a reason, which self-destructs once the error is actually fixed

**No silent bypasses**
- `eslint-comments/no-unlimited-disable` - `eslint-disable` must name the specific rule, never a blanket disable
- `eslint-comments/require-description` - every disable needs a one-line reason

**Correctness (free, core ESLint)**
- `no-empty` (with `allowEmptyCatch: false`, the default) - blocks `catch (e) {}` silently swallowing errors, one of the most common and dangerous AI-generated patterns
- `eqeqeq` - forces `===` over `==`, closes a class of coercion bugs
- `no-eval`, `no-new-func`, `no-implied-eval` - blocks `eval()`/`new Function()`, the AI-specific security-bypass variant flagged in the original research
- `require-await` - flags an `async` function that never actually awaits, a common leftover from an incomplete AI refactor
- `no-async-promise-executor` - blocks `new Promise(async (resolve) => {})`, which silently swallows errors thrown inside the executor
- `@typescript-eslint/no-unused-vars` - catches leftover dead code/imports, the same problem Knip targets but free and immediate

**Async safety (type-aware - needs `parserOptions.projectService` wired up, slower lint runs, but the single most consequential class of silent AI-generated bug)**
- `@typescript-eslint/no-floating-promises` - catches an async call that's never awaited (a write that never finishes, an error that never surfaces)
- `@typescript-eslint/no-misused-promises` - catches a promise used where a boolean/void was expected (e.g. `if (asyncFn())`, an async handler passed where a sync one is required)

**Node-specific (only if the project runs on Node)**
- `n/no-deprecated-api` (`eslint-plugin-n`) - flags deprecated/removed Node core APIs by name, including `new Buffer()`. This is what actually catches "no stale APIs" mechanically - moved here from the review-only list since a real rule exists for it.

**Optional, per test framework (pick the one matching the project's test runner)**
- `jest/expect-expect` or the vitest-plugin equivalent - fails a test that never calls an assertion, catching the emptiest form of a tautological test. Framework-specific, so not part of the core universal set.

## Review-enforced (no lint rule exists for these; the agent must self-apply them, and PR review is the backstop)

**No fluff comments.** Don't restate what the code already says. Only comment the non-obvious *why* - a hidden constraint, a workaround, a subtle invariant. Default to no comments. Delete anything that restates code/types, and don't repeat the same rationale across multiple files - say it once, in the place it matters most.

**No hallucinated dependencies.** Never add a package without confirming it actually exists and is the one you meant (typosquatted/hallucinated package names are a real supply-chain attack vector). In practice this is already caught by a normal `npm ci` in CI, since a fabricated package was never in the lockfile - but don't rely on CI to catch what you can just not do.

**No over-engineering.** No abstraction, config option, or generic parameter the current task doesn't need. Three similar lines beat a premature abstraction. That said, substance over dogma: "don't create tech debt" is a default, not a law - a well-reasoned "won't-do" (a schema migration that genuinely belongs in its own PR, a derived value that would add drift risk if persisted) is a valid answer when the reasoning is honest and stated. (Partially backstopped mechanically already by the complexity/depth/length rules above - this is the judgment call those numbers can't fully capture.)

**No unrequested scope.** Don't refactor, clean up, or "improve" code outside what was asked.

## Testing

**No tautological tests.** A test that just re-asserts what the implementation does isn't testing anything. Test observable behavior, never duplicate production logic in the assertion itself. (`jest/expect-expect` or the vitest equivalent above catches the emptiest case - a test with no assertion at all - but can't catch a test that has an assertion and is still tautological; that part stays a review call.)

**Reproduce the bug first.** When fixing a bug, write the failing test that reproduces it before writing the fix. That test becomes the regression test - it's the proof the fix addressed the real root cause, not just a symptom.

**Cover the edge cases the happy path skips.** Empty input, boundary values, the failure branch - not just the success path. (Coverage thresholds in the test runner - vitest/jest/c8 `coverage.thresholds` - are a related, generic mechanical backstop: not the same claim as "these are the *right* edge cases," but they do catch code with no test touching it at all.)

**A hard-to-test path is a design smell, not an excuse.** If something's hard to test, that's usually a sign the code needs restructuring, not a reason to leave it uncovered.

## Agent workflow guardrails

Not code rules - discipline for how the work itself gets done. Applies to any agent operating semi-autonomously, not just ones writing code.

1. **Verify against ground truth before asserting.** Read the actual code, transcript, or live state and re-run the check yourself. Never relay a claim - yours, a reviewer's, or a bot's - as fact without independently confirming it.
2. **Scope claims precisely.** Don't overstate or under-scope: in-diff vs. out-of-scope, narrow vs. independent, honest severity (a "P1" that's really a nit is a nit, say so).
3. **Pause and surface high-consequence and product/design calls; never guess.** Money paths, irreversible data loss, security/PII boundaries - whatever counts as high-stakes for this project. Apply only mechanical fixes autonomously. Hand judgment calls back with evidence and options, not a unilateral pick.
4. **Right-size the model/tool to the task**, with a stated reason - not the biggest hammer on everything.
5. **Delegate-only orchestration.** A coordinating agent never does the project work itself - it spawns the most-specific subagent for the task in an isolated worktree, and relays.
6. **Read the summary first, then verify the diff against its claims.** Over-claiming and under-claiming are both findings; a summary that misdescribes the change is itself a defect.
7. **Route corrections into durable agent instructions, not one-off fixes.** A correction goes into that agent's own instructions file so the next run inherits it, not just the current output.
8. **Isolation and safety on live environments.** Never touch a live/primary worktree without explicit go-ahead. No force, discard, or merge without an explicit word. Reviews of live state stay strictly read-only.
9. **Self-review before submitting.** Re-read your own diff as if reviewing someone else's before calling it done - the last edit being correct isn't the same as the whole diff being correct.
