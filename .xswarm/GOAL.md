<!-- PROPOSED by goal-propose.py. Inferred from repo evidence, not
     confirmed by Chad. Raise at the next planning meeting. -->

# Goal (PROPOSED)

## What this is for

The evidence supports one reading better than any other, and I'm inferring it rather than reading it anywhere: **xswarm-qa exists to make your own QA practice portable off your laptop.** You already have the practice — `~/.claude/domains/qa.md`, the `qa-loop` skill, the `webapp-testing` skill, and a `Site Audit` project with per-domain folders for bahai-library.com, oceanlibrary.com, drbi.org, bahaiteachings.org. All of it lives in your dotfiles and only works where your dotfiles are. xswarm-qa takes that practice, freezes it into a self-contained workspace directory that carries its own agent instructions, and distributes it over npm so any agent on any box — Boss, Jafar, a client's repo, a cron job — can run it without inheriting your `~/.claude`. The persona in the README is "solo developer with many projects." That is you. The four sites in `Site Audit/` are the actual audit roster.

The thing shipped is not a testing tool. `src/` is 1,014 lines and 605 of them are `templates.js`. There is no crawler, no runner, no report generator, no database. The product is a prompt pack plus a directory convention plus an interview that fills in the blanks. That is a real product shape, and it should be named as one.

## What success looks like

A dated `runs/` directory exists on a machine that is not this one, produced by an agent nobody watched, containing a report you actually read and filed a fix from. Repeat that six times across the Site Audit roster and the practice has moved out of your head and into a package. The check: run `find ~ /Volumes -name 'xswarm-qa.config.json5'` on the fleet and count workspaces that have run more than twice.

The stronger version: you stop invoking `/qa` by hand on a site because the workspace already told you what was wrong before you asked.

## What would falsify this

**No `xswarm-qa.config.json5` exists anywhere outside this repo.** Everything else follows from that one. Supporting observations, all checkable in a minute:

- npm `time.modified` is 2026-02-06. The entire project — twelve commits, v1.0.0 through v1.0.4 — was built and published on 2026-02-05. In the seven months since, one commit: `.gitignore` hygiene on 2026-09-03. Nothing has been added, fixed, or republished.
- When you wanted a site audited in those seven months, you used `Site Audit/` and the `/qa` command, not this.
- The 25K PRD specifies libSQL with vector search, a caching layer, schema migrations, regression tracking across runs, and PDF reports. The only trace of any of it in the code is one table row in a generated README reading "future: libSQL + vectors."

If those hold, the premise is wrong in a specific way: this was not the portable form of your QA practice. It was a one-day exploration of what that package *would* look like, the README got written before the engine, and the practice stayed in `~/.claude` because that is where it was already working. The correct move at the meeting would then be to fold the good parts of `templates.js` back into `domains/qa.md` and archive the package.

## Explicitly not the goal

**Building the PRD.** The libSQL vector store, the cache manifests, the schema migration path, the multi-agent backend matrix (`.gemini/`, `.codex/`, `.local/` are all generated today and none are exercised) — that is a testing platform, and building it puts you in the ring with Playwright and every QA SaaS on a product you made in a day. The value here is the prompt pack. A prompt pack does not need a database.

**Competing with `Site Audit/`.** These two overlap almost completely: same dimensions (SEO, performance, accessibility, security, usability), same output shape (dated per-domain folder, diff against prior run), same target sites. One is a Claude Code skill suite; the other is an npm installer that writes agent instructions. Two implementations of one practice is the actual problem on the table, and the goal should be to end with one, not to grow both.

## Where I am guessing

Ranked. The first two change the goal entirely if I'm wrong.

- **That the user is you, not a market.** The README is written for strangers — badges, a problem/solution table, four personas including "Agency overseeing 50+ client sites." If you actually intend outside users, this is a product-with-no-distribution problem, not a portability problem, and the goal is marketing, not consolidation. I read it as you, because the only integration you built is OpenClaw notification and the only real audit roster is your own sites.
- **That the seven-month gap means dormant rather than done.** Possibly it's finished and correct and simply hasn't needed a commit. But then there should be workspaces in use, and I can't see any from here. Tell me if there are.
- **That `Site Audit/` and xswarm-qa are redundant rather than deliberately split.** Plausible alternative: `Site Audit` is for *your* sites where the skills are available, xswarm-qa is for *client* sites where they aren't. If that's the split, say so and I'll stop calling it duplication.
- **That OpenClaw integration is the point, not a detail.** Four of the twelve commits are OpenClaw work — notify on workspace creation, `--force` trigger, first-run-always-fires. If the real goal is "OpenClaw can commission a QA run on any site," this is a fleet capability and belongs in the fleet story alongside Boss and Jafar, not framed as a standalone npm package at all.
- **That `check-and-run.sh` and the update-detection strategies work.** I read the generator, not a run. I have not seen this produce a report.
