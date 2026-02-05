// templates.js — All generated file content for QA workspaces.
//
// Each export is a function returning a string ready for disk.
// Pure data transforms: interview answers → file content. No side effects.
//
// The QA.md templates are the most important output — they're the complete
// "brain" that AI agents read to run autonomous QA sessions. The core
// methodology is shared; only the agent-specific CLI headers differ.

const host = (url) => { try { return new URL(url).hostname; } catch { return 'site'; } };

// ── Workspace .gitignore ────────────────────────────────────
export const gitignore = () => `.env.local
.xswarm-qa/db/
.xswarm-qa/cache/
.xswarm-qa/.last-version
runs/
*.log
.DS_Store
node_modules/
.signal
`;

// ── Credentials ─────────────────────────────────────────────
export const envLocal = (a) => `# xSwarm QA Credentials — NEVER commit this file
# Referenced by the AI agent during authenticated testing sessions.
${a.authMode === 'auth' ? `AUTH_USERNAME=${a.username || ''}
AUTH_PASSWORD=${a.authPassword || ''}` : `# Uncomment and fill in to enable authenticated testing:
# AUTH_USERNAME=test@example.com
# AUTH_PASSWORD=your-password`}
`;

// ── JSON5 Config ────────────────────────────────────────────
// Quoted keys so the file can be parsed by JSON.parse after stripping
// comments and trailing commas — no JSON5 library needed at runtime.
export const config = (a) => `// xSwarm QA Configuration — ${host(a.url)}
// Edit this file anytime. Changes take effect on the next run.
// Format: JSON5 (comments OK, trailing commas OK).
// Docs: https://xswarm.ai
{
  // ─── Target Site ───────────────────────────────────────
  "site": {
    "name": "${host(a.url)}",
    "url": "${a.url}",
    "domains": [${a.domains ? a.domains.split(',').map(d => `"${d.trim()}"`).join(', ') : ''}],
  },

  // ─── Authentication ────────────────────────────────────
  // Enable: set required to true, add credentials to .env.local
  "auth": {
    "required": ${a.authMode === 'auth'},
    "loginUrl": "${a.loginUrl || ''}",
  },

  // ─── Update Detection ─────────────────────────────────
  // How check-and-run.sh decides whether to trigger a QA session.
  // Strategies: version-endpoint | rss | sitemap | homepage-hash | manual
  "updates": {
    "strategy": "${a.strategy}",${a.strategy === 'version-endpoint' ? `
    "endpoint": "${a.strategyConfig?.endpoint || ''}",
    "jsonPath": "${a.strategyConfig?.jsonPath || '.version'}",` : ''}${a.strategy === 'rss' ? `
    "feedUrl": "${a.strategyConfig?.feedUrl || ''}",` : ''}
  },

  // ─── Schedule ──────────────────────────────────────────
  "schedule": {
    "frequency": "${a.frequency}",  // on-change | daily | weekly | manual
    "rapidDevelopment": ${!!a.rapidDev},  // shorter cache TTL, deeper testing
  },

  // ─── AI Agent ──────────────────────────────────────────
  // All agents installed (.claude/, .gemini/, .codex/, .local/).
  // Change "type" to switch. No reinstall needed.
  "agent": {
    "type": "${a.agent}",  // claude-code | gemini-cli | codex | local-ai
    "flags": ["--yolo"],${a.agent === 'local-ai' ? `
    // Customize for your inference server:
    // "endpoint": "http://localhost:11434/api/generate",
    // "model": "llama3:70b",` : ''}
  },

  // ─── OpenClawd Integration ─────────────────────────────
  "openclawd": {
    "enabled": ${!!a.openclawd},
  },

  // ─── Notifications ─────────────────────────────────────
  "notifications": {
    "type": "${a.notification || 'none'}",  // webhook | file-signal | none${a.notification === 'webhook' ? `
    "url": "${a.webhookUrl || ''}",` : ''}
  },
}
`;

// ── check-and-run.sh ────────────────────────────────────────
// The single entry point for both manual runs and OpenClawd cron jobs.
// Creates a timestamped session, constrains agent writes to that folder,
// then invokes whichever AI agent is configured.
export const checkAndRun = (a) => `#!/usr/bin/env bash
# xSwarm QA — Session runner for ${host(a.url)}
# Usage: ./check-and-run.sh [--force]
set -euo pipefail
cd "$(dirname "$0")"

SESSION="runs/$(date +%Y-%m-%d_%H-%M-%S)"
mkdir -p "$SESSION/screenshots"

# Safety: constrain agent writes to session folder only
export XSWARM_SESSION_PATH="$SESSION"
export XSWARM_TOOLS_PATH=".xswarm-qa/tools"
export ALLOWED_WRITE_PATH="$SESSION"

echo "══════════════════════════════════════════"
echo "  xSwarm QA · ${host(a.url)}"
echo "  Session: $SESSION"
echo "══════════════════════════════════════════"

# ── Update Detection ────────────────────────────────────
if [[ "\${1:-}" != "--force" ]]; then
  if node .xswarm-qa/tools/check-update.js 2>/dev/null; then
    echo "  Changes detected. Starting QA session..."
  else
    echo "  No changes detected. Use --force to run anyway."
    exit 0
  fi
fi

# ── Read Agent Type ─────────────────────────────────────
# Uses node to correctly parse JSON5 config (handles comments + trailing commas)
AGENT=$(node -e "
  const raw = require('fs').readFileSync('xswarm-qa.config.json5','utf8');
  const j = raw.replace(/\\/\\/.*$/gm,'').replace(/\\/\\*[\\s\\S]*?\\*\\//g,'').replace(/,\\s*([}\\]])/g,'\\$1');
  try { console.log(JSON.parse(j).agent.type); } catch { console.log('claude-code'); }
" 2>/dev/null || echo "claude-code")

echo "  Agent: $AGENT"
echo ""

# ── Invoke Agent ────────────────────────────────────────
case "$AGENT" in
  claude-code)
    claude --print --dangerously-skip-permissions \\
      -p "Read .claude/QA.md for your complete instructions. Session folder: $SESSION" \\
      2>&1 | tee "$SESSION/session.log"
    ;;
  gemini-cli)
    gemini < .gemini/QA.md 2>&1 | tee "$SESSION/session.log"
    ;;
  codex)
    codex --prompt-file .codex/QA.md 2>&1 | tee "$SESSION/session.log"
    ;;
  local-ai)
    echo "  Local AI requires custom configuration."
    echo "  Edit this script to add your model invocation command."
    exit 1
    ;;
  *)
    echo "  Unknown agent: $AGENT"
    exit 1
    ;;
esac

echo ""
echo "  Session complete: $SESSION/"
node .xswarm-qa/tools/notify.js "$SESSION" 2>/dev/null || true
`;

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

// ── Update Detection Tool ───────────────────────────────────
// Standalone Node.js script (CommonJS — no package.json dependency).
// Called by check-and-run.sh. Exit 0 = changed, exit 1 = unchanged.
export const checkUpdateTool = () => `#!/usr/bin/env node
// xSwarm QA — Update Detection
// Compares current site state against .xswarm-qa/.last-version
// to decide whether a QA session is warranted.
//
// Exit 0 = changes detected → run QA
// Exit 1 = no changes → skip

const { readFileSync, writeFileSync, existsSync } = require('fs');

// Minimal JSON5 reader: strip comments + trailing commas → JSON.parse
const readConfig = (path) => {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(
    raw.replace(/\\/\\/.*$/gm, '').replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').replace(/,\\s*([}\\]])/g, '$1')
  );
};

// Quick non-crypto hash for string comparison
const hash = (s) => { let h = 0; for (const c of s) h = ((h << 5) - h + c.charCodeAt(0)) | 0; return h.toString(36); };

const LAST = '.xswarm-qa/.last-version';

(async () => {
  const config = readConfig('xswarm-qa.config.json5');
  const { strategy } = config.updates;

  if (strategy === 'manual') process.exit(1);

  const prev = existsSync(LAST) ? readFileSync(LAST, 'utf8').trim() : '';
  let curr = '';

  if (strategy === 'version-endpoint') {
    const res = await fetch(config.updates.endpoint);
    const data = await res.json();
    curr = config.updates.jsonPath.split('.').filter(Boolean).reduce((o, k) => o?.[k], data)?.toString() || '';
  } else if (strategy === 'rss') {
    const res = await fetch(config.updates.feedUrl);
    curr = res.headers.get('last-modified') || hash(await res.text());
  } else if (strategy === 'sitemap') {
    const res = await fetch(new URL('/sitemap.xml', config.site.url));
    curr = hash(await res.text());
  } else if (strategy === 'homepage-hash') {
    const res = await fetch(config.site.url);
    // Strip nonce/timestamp elements for stable comparison
    curr = hash((await res.text()).replace(/<script[^>]*nonce[^>]*>[\\s\\S]*?<\\/script>/g, ''));
  }

  if (curr && curr !== prev) {
    writeFileSync(LAST, curr, 'utf8');
    process.exit(0);
  }
  process.exit(1);
})().catch(() => process.exit(1));
`;

// ── Notification Tool ───────────────────────────────────────
// Sends alerts after session completion. Supports webhook + file signal.
export const notifyTool = () => `#!/usr/bin/env node
// xSwarm QA — Post-session Notifications
// Usage: node notify.js <session-path>
//
// Reads notification config and sends alerts via the configured method.
// Failures are non-fatal (check-and-run.sh ignores exit code).

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

const readConfig = (path) => {
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(
    raw.replace(/\\/\\/.*$/gm, '').replace(/\\/\\*[\\s\\S]*?\\*\\//g, '').replace(/,\\s*([}\\]])/g, '$1')
  );
};

(async () => {
  const session = process.argv[2];
  if (!session) { console.error('Usage: notify.js <session-path>'); process.exit(1); }

  const config = readConfig('xswarm-qa.config.json5');
  const { type, url } = config.notifications;
  if (type === 'none') return;

  const summaryPath = join(session, 'summary.json');
  const payload = existsSync(summaryPath)
    ? JSON.parse(readFileSync(summaryPath, 'utf8'))
    : { site: config.site.name, session, status: 'completed' };

  if (type === 'webhook' && url) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'qa-session-complete', ...payload }),
    });
    console.log('  Webhook:', res.status);
  } else if (type === 'file-signal') {
    writeFileSync('.signal', JSON.stringify(payload, null, 2));
    console.log('  Signal file written: .signal');
  }
})().catch(e => console.error('  Notification failed:', e.message));
`;
