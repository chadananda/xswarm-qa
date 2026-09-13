// templates.js — All generated file content for QA workspaces.
// Barrel: workspace files defined here, the larger templates in ./templates/.
//
// Each export is a function returning a string ready for disk.
// Pure data transforms: interview answers → file content. No side effects.

import { host } from './templates/host.js';

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

  // ─── Notifications ─────────────────────────────────────
  // Sent by .xswarm-qa/tools/notify.js once a session finishes.
  //   none        — do nothing (default)
  //   webhook     — POST the run summary to "url"
  //   file-signal — write .signal in the workspace root
  "notifications": {
    "type": "none",  // none | webhook | file-signal
    "url": "",
  },

  // ─── OpenClaw Integration ──────────────────────────────
  "openclaw": {
    "enabled": ${!!a.openclaw},${a.openclaw ? `
    "cronSchedule": "${a.cronSchedule}",
    "notifyOnReport": ${!!a.openclawNotify},` : ''}
  },
}
`;

// ── check-and-run.sh ────────────────────────────────────────
// The single entry point for both manual runs and OpenClaw cron jobs.
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
  if node .xswarm-qa/tools/check-update.js; then
    echo "  Changes detected. Starting QA session..."
  else
    echo "  No changes detected. Use --force to run anyway."
    exit 0
  fi
fi

# ── Read Agent Type ─────────────────────────────────────
# Via the shipped reader: the config is JSON5 and a naive //-strip truncates the
# site url, which used to send every workspace to claude-code regardless of config.
AGENT=$(node .xswarm-qa/tools/config-get.js agent.type || echo "claude-code")

echo "  Agent: $AGENT"
echo ""

# ── Invoke Agent ────────────────────────────────────────
# In a function so a failing agent does not trip set -e and skip the reporting
# below. A QA watchdog that notifies on success and goes quiet on failure says
# nothing on exactly the day you need to hear from it.
run_agent() {
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
      return 1
      ;;
    *)
      echo "  Unknown agent: $AGENT"
      return 1
      ;;
  esac
}

AGENT_STATUS=0
run_agent || AGENT_STATUS=$?

echo ""
if [[ $AGENT_STATUS -eq 0 ]]; then
  echo "  Session complete: $SESSION/"
else
  echo "  Session FAILED — agent exited $AGENT_STATUS. Log: $SESSION/session.log" >&2
fi
${a.openclawNotify ? `
# ── Notify OpenClaw ────────────────────────────────────
REPORT_PATH="$(pwd)/$SESSION/report.md"
if command -v openclaw &>/dev/null; then
  openclaw system event --text "xSwarm QA $([[ $AGENT_STATUS -eq 0 ]] && echo 'report ready' || echo 'run FAILED') for ${host(a.url)}. Read the report at: $REPORT_PATH" --mode now 2>/dev/null || true
fi
` : ''}
# Always notify, pass or fail; the exit code tells notify.js which it was.
node .xswarm-qa/tools/notify.js "$SESSION" "$AGENT_STATUS" || true

exit $AGENT_STATUS
`;

// ── Re-exports ──────────────────────────────────────────────
export { agentQA } from './templates/agent-qa.js';
export { checkUpdateTool, notifyTool } from './templates/tools.js';
export { workspaceReadme } from './templates/readme.js';
