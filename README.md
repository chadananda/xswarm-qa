<div align="center">

```
  ██╗  ██╗
  ╚██╗██╔╝  ╔═╗╦ ╦╔═╗╦═╗╔╦╗  ╔═╗╔═╗
   ╚███╔╝   ╚═╗║║║╠═╣╠╦╝║║║  ║═╣╠═╣
   ██╔██╗   ╚═╝╚╩╝╩ ╩╩╚═╩ ╩  ╚═╝╩ ╩
  ██╔╝ ██╗
  ╚═╝  ╚═╝  Autonomous AI Quality Assurance
```

**Point any AI agent at a web app. Get a professional QA audit.**<br>
**No integration. No test scripts. Just a URL.**

[![npm version](https://img.shields.io/npm/v/xswarm-qa)](https://npmjs.com/package/xswarm-qa)
[![node](https://img.shields.io/node/v/xswarm-qa)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/xswarm-qa)](LICENSE)

</div>

---

## The Problem

You ship a web app. You need QA. Your options aren't great:

| Approach | Pain |
|----------|------|
| Manual testing | Expensive, inconsistent, doesn't scale |
| Selenium/Playwright | Brittle scripts that only test what you anticipate |
| SaaS platforms | Require integration, accounts, monthly fees |

None of these test like a real user. None discover the issues that surprise you in production — the confusing flow, the keyboard trap, the flash of unstyled content, the button that *looks* disabled but isn't.

## The Solution

```bash
npx xswarm-qa my-app-qa
```

One command. Six questions. You get a self-contained workspace that any AI agent can use to autonomously test your web application.

The agent explores your app like a human, thinks like a QA consultant, and generates a professional audit report — with screenshots, severity ratings, fix suggestions, and regression tracking across runs.

---

## Quick Start

```bash
# Create a workspace (interactive setup)
npx xswarm-qa my-app-qa

# Review your configuration
cd my-app-qa
cat xswarm-qa.config.json5

# Run your first QA session
./check-and-run.sh
```

The setup interview walks you through 6 stages:

```
  Stage 1 of 6 · Site Configuration
  ────────────────────────────────────────────
  ? Primary URL to test: https://example.com
  ? Additional domains (comma-separated, optional):

  Stage 2 of 6 · Authentication
  ────────────────────────────────────────────
  ? Testing mode: Audit only — public pages, no login

  ...

  Configuration Summary
  ──────────────────────────────────────────────────────
  Site        https://example.com
  Auth        Audit only
  Updates     Homepage hash
  Schedule    On change detected ⚡ rapid
  Agent       Claude Code
  Notify      None

  ? Ready to create workspace? ✓ Create workspace

  ✔ Workspace created successfully
```

---

## How It Works

```
  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
  │   npx setup     │ ───→ │   AI explores   │ ───→ │   QA report     │
  │   (6 questions) │      │   your app      │      │   (MD + JSON)   │
  └─────────────────┘      └─────────────────┘      └─────────────────┘
```

1. **Initialize** — `npx xswarm-qa <folder>`, answer 6 questions
2. **Run** — `./check-and-run.sh` invokes your chosen AI agent
3. **Report** — Professional audit lands in `runs/<timestamp>/`

### What the Agent Does

- Navigates your site like a real user — no scripted paths
- Generates 5–10 realistic test scenarios based on site structure
- Tests every scenario across **desktop · tablet · mobile**
- Checks **keyboard navigation**, **dark mode**, **ARIA labels**
- Reports subjective experience: *"The checkout button looks disabled but is clickable"*
- Tracks issues across runs — knows what's new, what's fixed, what persists
- Stays within a 60-minute time budget, samples intelligently for large sites

---

## Multi-Agent Support

All agent configs are installed during setup. Switch agents by changing one line in `xswarm-qa.config.json5`:

| Agent | Best For | Model |
|-------|----------|-------|
| **Claude Code** | Exploratory testing, UX analysis | OAuth subscription, no API key |
| **Gemini CLI** | Fast automated checks | Cost-effective for frequent runs |
| **Codex** | Code-focused QA | Strong at code-level issue detection |
| **Local AI** | Privacy, air-gapped environments | Ollama, LM Studio, vLLM — your hardware |

```json5
// xswarm-qa.config.json5
"agent": {
  "type": "claude-code",  // ← change this to switch
  "flags": ["--yolo"],
}
```

---

## Workspace Structure

```
my-app-qa/
├── xswarm-qa.config.json5       ← Settings (edit anytime)
├── .env.local                    ← Credentials (gitignored)
├── check-and-run.sh              ← Entry point
│
├── .xswarm-qa/                   ← Infrastructure (managed)
│   ├── version.txt               ← Installed version
│   ├── tools/check-update.js     ← Update detection
│   ├── tools/notify.js           ← Post-run notifications
│   ├── db/                       ← Issue tracking (future)
│   └── cache/                    ← Page snapshots
│
├── .claude/QA.md                 ← Claude Code instructions
├── .gemini/QA.md                 ← Gemini CLI instructions
├── .codex/QA.md                  ← Codex instructions
├── .local/QA.md                  ← Local AI template
│
└── runs/                         ← Session output
    └── 2025-06-15_14-30-00/
        ├── report.md             ← Human-readable audit
        ├── summary.json          ← Machine-readable results
        ├── screenshots/          ← Evidence images
        └── session.log           ← Full agent conversation
```

---

## What Gets Tested

The agent doesn't just check boxes — it reports the **experience** of using your app.

| Category | What It Catches |
|----------|----------------|
| **Bugs** | JS errors, broken flows, data display issues, crashes |
| **UX** | Confusing navigation, unclear affordances, missing feedback |
| **Accessibility** | WCAG violations, keyboard traps, missing ARIA, poor contrast |
| **SEO** | Missing metadata, broken heading hierarchy, dead links |
| **Performance** | Slow loads (>3s), layout shifts, flash of unstyled content |

### Real Issue Examples

> *"After submitting the contact form, there's no confirmation message — I wasn't sure it worked"*

> *"The 'Filter' dropdown is invisible on mobile (768px) — the button exists but renders off-screen"*

> *"Keyboard focus gets trapped inside the modal — no way to close it with Esc or Tab"*

---

## Autonomous Scheduling

Pair with [OpenClaw](https://openclaw.ai/) for fully hands-off QA:

1. xSwarm QA **auto-detects** OpenClaw during setup
2. Creates a **cron job** that checks for site changes
3. Triggers a QA session **only when something changed**
4. Sends results via **webhook, file signal, or email**

No babysitting. Your site gets tested every time you deploy.

---

## Configuration

Everything lives in `xswarm-qa.config.json5` — extensively commented JSON5. Edit directly; changes take effect on next run. No rebuild, no restart.

### Update Detection Strategies

| Strategy | How It Works |
|----------|-------------|
| `version-endpoint` | Polls a JSON API for version string |
| `rss` | Watches RSS feed for new entries |
| `sitemap` | Hashes sitemap.xml, detects structural changes |
| `homepage-hash` | Catches any visible homepage content change |
| `manual` | Only runs when you say so (`--force`) |

### Authentication

Start in audit-only mode (public pages). Enable authenticated testing anytime:

1. Set `"auth": { "required": true }` in config
2. Add credentials to `.env.local` (gitignored, never committed)
3. Next run picks it up automatically

---

## Architecture

```
                      ┌──────────────────┐
  npx xswarm-qa ────→│  CLI Installer    │────→ Workspace files
                      └──────────────────┘
                               │
                      ┌──────────────────┐
  check-and-run.sh ─→│ Update Detection  │────→ Changed?
                      └──────────────────┘        │
                              no ← exit      yes ↓
                      ┌──────────────────┐
                      │   AI Agent       │────→ Explores site
                      │  (your choice)   │      Tests scenarios
                      └──────────────────┘      Logs issues
                               │
                      ┌──────────────────┐
                      │  Session Output  │────→ report.md
                      └──────────────────┘      summary.json
                               │                screenshots/
                      ┌──────────────────┐
                      │  Notifications   │────→ Webhook / file / email
                      └──────────────────┘
```

---

## Use Cases

**Solo Developer** — Set up once per project. Get continuous, consistent QA without manual effort or test maintenance.

**Consultant** — One workspace per client. Deliver professional audit reports. Use free preliminary audits as a prospecting tool.

**Agency** — Standardized quality across your entire portfolio. One folder per client, OpenClaw manages all schedules.

**Tech Lead** — Monitor production for regressions. Know when deploys break things before your users tell you.

---

## Roadmap

- [ ] libSQL database with vector search for semantic issue deduplication
- [ ] PDF report generation with xSwarm QA branding
- [ ] Visual regression testing via screenshot comparison
- [ ] axe-core deep accessibility scanning integration
- [ ] Framework auto-detection (Next.js, Astro, Rails, Laravel)
- [ ] Export to Linear, GitHub Issues, Jira
- [ ] Multi-site dashboard UI
- [ ] Slack / Discord notification channels

---

## CLI Options

```
npx xswarm-qa                    Show help + ASCII art
npx xswarm-qa <folder>           Create QA workspace (interactive)
npx xswarm-qa <folder> --dry-run Preview without creating files
npx xswarm-qa --version          Print version
npx xswarm-qa --help             Show help
```

---

## Contributing

Issues and PRs welcome. Please open an issue first to discuss what you'd like to change.

```bash
git clone https://github.com/chadananda/xswarm-qa.git
cd xswarm-qa
npm install
node src/index.js --help    # test locally
```

---

## License

MIT &copy; [Chad Jones](https://github.com/chadananda)

---

<div align="center">

**[xswarm.ai](https://xswarm.ai)**

Built for the AI-native QA workflow.

</div>
