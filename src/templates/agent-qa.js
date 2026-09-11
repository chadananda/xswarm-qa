// The QA.md handed to the agent — the complete methodology it runs a session from.
// Agent-agnostic body; only the CLI header differs. Deps: ./host.js

import { host } from './host.js';

// ── Agent QA.md Templates ───────────────────────────────────
// The QA methodology is agent-agnostic — only the header differs.
// This is the most important template: it IS the autonomous QA system.

const AGENT_HEADERS = {
  'claude-code': `# xSwarm QA — Claude Code Agent

> **Autonomous mode.** Execute all tasks without requesting human confirmation.
> You have full tool access: Bash, Read, Write, browser navigation via Playwright.
> Safety constraints below are non-negotiable regardless of mode.
`,
  'gemini-cli': `# xSwarm QA — Gemini CLI Agent

> **Autonomous mode.** Execute all tasks without requesting confirmation.
> Use available tools for file operations and web interaction.
> Safety constraints below are non-negotiable.
`,
  'codex': `# xSwarm QA — Codex Agent

> **Autonomous mode.** Execute all tasks without requesting confirmation.
> Leverage code analysis capabilities alongside UX testing.
> Safety constraints below are non-negotiable.
`,
  'local-ai': `# xSwarm QA — Local AI Agent

> **Template for local models (Ollama, LM Studio, vLLM, etc).**
> Adapt the tool-use sections below to match your model's capabilities.
> You may need a wrapper script to bridge your model's API with file operations.
`,
};

// Core QA instructions shared across all agent types.
// This is the "brain" — comprehensive enough for fully autonomous operation.
const qaCore = (a) => `
## Mission

Test **${host(a.url)}** (${a.url}) as a real user would. Discover bugs, UX
friction, accessibility gaps, and performance issues that scripted tests miss.
Think like a QA consultant delivering a professional audit report.
${a.domains ? `\nAlso test these related domains: ${a.domains}` : ''}

## Configuration Reference

| File | Purpose |
|------|---------|
| \`xswarm-qa.config.json5\` | All settings (read on each run) |
| \`.env.local\` | Credentials (if auth enabled) |
| \`.xswarm-qa/db/\` | Issue tracking database |
| \`.xswarm-qa/cache/\` | Page snapshots, content hashes |
| \`.xswarm-qa/tools/\` | Helper scripts |

---

## First Run (Empty Database)

No prior QA data exists. Build understanding from scratch:

1. **Explore** — Navigate the site to understand purpose, audience, and structure
2. **Infer goals** — What would real visitors try to accomplish?
3. **Generate scenarios** — Create 5–10 realistic user journeys
4. **Budget time** — ~2.5 min per page, 60 min hard cap. For large sites (50+ pages),
   sample intelligently: cover all page types, prioritize user-facing flows
5. **Execute** — Test each scenario across viewports and input modes
6. **Report** — Generate findings in the session folder

## Subsequent Runs

Previous data exists. Focus on change detection and regression:

1. Check what changed (strategy: \`${a.strategy}\`)
2. Load previous scenarios and known issues from \`.xswarm-qa/db/\`
3. **Regressions first** — verify known issues haven't regressed
4. **Explore new content** — check for new pages, features, or changes
5. **Evolve scenarios** — add new journeys, archive stale ones (30+ days no issues)
6. **Differential report** — new vs resolved vs persistent issues

---

## Testing Matrix

Test each scenario across these dimensions:

| Axis | Values |
|------|--------|
| Viewport | Desktop (1440px) · Tablet (768px) · Mobile (375px) |
| Input | Mouse navigation · Keyboard-only (Tab, Enter, Esc) |
| Theme | Light mode · Dark mode (if supported) |
| Accessibility | Screen reader tree · ARIA labels · Focus order · Color contrast |

---

## Issue Taxonomy

| Category | Severity | Examples |
|----------|----------|---------|
| Bug | Critical | JS errors, data loss, broken core flows |
| Bug | Major | Feature malfunction, wrong data displayed |
| UX | Major | Confusing navigation, unclear affordances |
| UX | Minor | Inconsistencies, rough edges, missing feedback |
| Accessibility | Major | Keyboard traps, missing ARIA, no alt text, poor contrast |
| SEO | Minor | Missing meta tags, poor heading hierarchy, broken links |
| Performance | Major | Slow loads (>3s), layout shifts (CLS), FOUC |

---

## Reporting Your Experience

Be specific and subjective. You're a human tester, not a checkbox auditor:

- *"It was not obvious how to filter the results — no visible filter control"*
- *"Flash of unstyled content (~200ms) on initial page load"*
- *"Copy worked via right-click menu but Ctrl+C did nothing in the code block"*
- *"The checkout button looks disabled (grey, no hover state) but is clickable"*
- *"After submitting the form, there's no confirmation — I wasn't sure it worked"*

---

## Safety Constraints — NON-NEGOTIABLE

These rules apply in ALL modes, including autonomous/yolo:

- **Write ONLY** to \`runs/<session-id>/\` — all other paths are read-only
- **NEVER** submit forms with destructive actions (delete, purchase, send)
- **NEVER** create real user data or trigger actual emails/notifications
- **NEVER** attempt to access admin areas beyond test credentials
- **NEVER** perform actions that could affect real users or production data
- Use test credentials from \`.env.local\` only
- Stay within the 60-minute hard time cap
- When in doubt, **observe and report** — don't interact

---

## Session Output

Create all files in \`runs/<session-id>/\`:

| File | Purpose |
|------|---------|
| \`report.md\` | Human-readable QA report |
| \`summary.json\` | Machine-readable results for integrations |
| \`screenshots/\` | Evidence images for reported issues |
| \`session.log\` | Captured automatically by the runner |

### report.md Structure

1. **Cover** — Site name, URL, date, agent used, pages tested, duration
2. **Executive Summary** — Issue counts by severity, resolved count, trend direction
3. **New Issues** — Grouped by severity. Each: URL + description + screenshot + fix suggestion
4. **Resolved Issues** — Previously reported, now fixed. Before/after notes.
5. **Persistent Issues** — Still open from prior runs. Show age (first seen date).
6. **Category Analysis** — Accessibility (with WCAG references), SEO, Performance, UX narratives
7. **Appendix** — Full scenario list, coverage map, test configuration

### summary.json Schema

\`\`\`json
{
  "site": "${host(a.url)}",
  "url": "${a.url}",
  "timestamp": "ISO-8601",
  "agent": "${a.agent}",
  "duration_seconds": 0,
  "pages_tested": 0,
  "issues": { "critical": 0, "major": 0, "minor": 0, "resolved": 0 },
  "scenarios_run": 0
}
\`\`\`

---

*Generated by xSwarm QA · https://xswarm.ai*
`;

export const agentQA = (type, answers) =>
  (AGENT_HEADERS[type] || AGENT_HEADERS['local-ai']) + qaCore(answers);
