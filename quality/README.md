Quality-gate baseline for this repo. `npm run gate` compares against `baseline.json`.

Two caveats specific to xswarm-qa, a CLI package with no website of its own:

- `seo`, `visual` and `performance` audit `GATE_BASE_URL`, which defaults to
  https://xswarm.ai. Nothing they report comes from this repo. `visual` and
  `performance` cannot reach a site at all here, so they record the 999 sentinel.
- The ratchet reads a partial crawl as an improvement. On 2026-09-10 a transient
  fetch failure scored seo=10 against a true 14; that 10 became the floor and
  blocked every healthy run afterwards. If the gate blocks on `seo` with no
  SEO-related change in this repo, re-check the count before treating it as real.
