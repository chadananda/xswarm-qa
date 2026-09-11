Quality-gate baseline for this repo. `npm run gate` runs the project-local
`quality/gate.mjs` and compares against `baseline.json`.

The `*.mjs` here are synced fleet tooling and are gitignored — edit them via
sync-quality, never by hand. `baseline.json` and this file are this project's own and
are tracked.

Two things to know before treating a number here as this repo's fault:

- **elegance scopes in `quality/*.mjs` deliberately** (see its own comment, "union in
  what's actually on disk there so the gate audits itself too"). 68 of the 101 findings
  are in that synced tooling, not in `src/`. A fleet re-sync therefore moves this
  project's count with no commit here: on 2026-09-11 a sync at 08:34 — 14h after the
  baseline was recorded — took elegance 107 → 108 and blocked the gate while no `src/`
  file had changed since the day before.
- **elegance is scoped off `git ls-files`**, so a new file is invisible until it is
  staged. A refactor that adds files will read artificially low until `git add`.

The 33 findings in `src/` are two known false positives: 32 `console-log` (this is an
interactive CLI — `console.log` is its user interface, not leftover debugging) and
`src/index.js` missing a first-line header comment (line 1 must be the shebang for a
`bin` entry point). Every actionable `src/` finding has been cleared.

`seo`, `visual` and `performance` report 1 each: this package has no website, so there
is no site URL to audit. `--fast` skips all three and is what `prepublishOnly` and
`.githooks/pre-push` use.
