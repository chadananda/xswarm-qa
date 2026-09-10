Quality-gate baseline for this repo. `npm run gate` compares against `baseline.json`.

Two caveats specific to xswarm-qa, a CLI package with no website of its own:

- `seo`, `visual` and `performance` audit `GATE_BASE_URL`, which defaults to
  https://xswarm.ai. Nothing the three of them report comes from this repo. As of
  2026-09-10 all three now reach that site and record real counts (visual 75, seo 13,
  performance 9), so a regression on the xswarm.ai *website* will block a full gate run
  here. `--fast` skips all three, which is what the pre-push hook and `prepublishOnly`
  use, so only a manual `npm run gate` is exposed.
- The ratchet reads a partial crawl as an improvement. On 2026-09-10 a transient fetch
  failure scored seo=10 against a true 14; that 10 became the floor and blocked every
  healthy run afterwards. If the gate blocks on one of the three network checks with no
  matching change in this repo, re-check the count before treating it as real.
