# xSwarm QA - Product Requirements Document

**Product:** xSwarm QA
**Version:** 1.0
**Target:** Autonomous web application quality assurance using AI TUI agents
**Implementation:** Claude Code primary agent with extensible backend support

---

## Vision

xSwarm QA transforms quality assurance into an autonomous, continuous process that mimics real user behavior. Unlike traditional testing tools, it generates realistic scenarios, explores applications naturally, and reports experiential issues that scripted tests miss.

Primary use case: Point at any web application and receive professional QA audit reports without integration, test setup, or manual scripting.

---

## Core Principles

**Agent-native architecture** - Built for Claude Code and similar TUI agents as first-class execution environments
**Zero integration required** - Works on any website via URL alone
**Token efficient** - Aggressive caching, incremental updates, smart compression
**Local-first storage** - Everything contained in per-site QA folders
**Production safe** - Read-only operations, sandboxed writes
**Evolving intelligence** - Knowledge compounds across runs
**Consultant quality** - Professional reports suitable for client delivery

---

## User Personas

**Solo developer** - Manages multiple projects, wants consistent QA without manual effort
**Consultant** - Audits client sites, generates professional reports, prospects with free analyses
**Agency** - Oversees 50+ client sites with standardized quality checks
**Tech lead** - Monitors production applications for regressions and UX issues

---

## Setup Experience

### Command Structure

**Single command - initialization only:**
`npx xswarm-qa <folder-name>`

This is the ONLY command. After initialization, all configuration changes happen via direct file editing. No additional CLI commands for auth, updates, or management.

**No arguments shows help:**
Full explanation with ASCII art logo, feature list, usage examples, and documentation links.

### ASCII Art Logo

Design inspired by Claude Code's aesthetic - clean, technical, memorable. Display on every invocation.

### Interview Flow

Six-stage guided setup with ability to review and modify previous answers:

**Stage 1: Site Configuration**
Primary URL with validation (must be reachable). Optional additional domains for multi-domain sites like docs subdomains or API portals. Support comma-separated list input.

**Stage 2: Authentication**
Start in audit-only mode (public pages only) or enable authentication. If skipped, authentication can be added later by editing `xswarm-qa.config.json5` and `.env.local`. Capture login URL and test credentials if provided. Store in `.env.local` with gitignore protection. Warn against committing credentials.

**Stage 3: Update Detection**
Present strategies: version endpoint, RSS feed monitoring, sitemap checksum, homepage hash, manual trigger only. Validate chosen strategy during setup (test endpoint reachability, verify RSS exists, etc).

**Stage 4: Schedule & Frequency**
Rapid development flag affects run frequency. Options: on-change, daily at time, weekly on day, manual only. Explain implications of each choice.

**Stage 5: Agent Selection**
Default Claude Code (OAuth subscription model, not API). Alternatives: Gemini CLI, Codex, or local AI (Ollama, LM Studio, etc). All cloud agent configs installed during setup. Local AI requires custom configuration. User selects default in config file. Switching agents later requires only config edit. Explain trade-offs clearly: Claude Code best for exploratory testing, Gemini faster and cheaper, Codex for code-focused QA, local AI for privacy/cost control but may require more powerful hardware.

**Stage 6: OpenClawd Integration**
Auto-detect OpenClawd installation. Offer cron job creation. Configure notification method: webhook with URL validation, file signal, email (if configured), or none.

### Navigation Features

Allow "back" to previous questions without restarting. Show current answer when returning to question. Display progress indicator (Stage N of 6).

### Validation Requirements

Test all URLs for reachability. Verify auth endpoints exist. Validate webhook URLs respond. Check OpenClawd binary is executable. Confirm agent CLI tools are installed. Skip only AI-requiring validations.

### Dry Run Mode

Hidden flag `--dry-run` for development testing. Shows what would be created without filesystem writes. Not documented in user help.

---

## Folder Structure

Per-site workspace contains everything needed for autonomous operation:

**User-editable files (root level):**
`xswarm-qa.config.json5` - All settings with extensive inline comments
`.env.local` - Credentials (gitignored)
`check-and-run.sh` - Entry point for OpenClawd or manual runs

**Infrastructure (hidden in .xswarm-qa/):**
`.xswarm-qa/` - All xSwarm QA infrastructure, replaced during updates
  `version.txt` - Current xSwarm QA version (e.g., "1.2.3")
  `schema-version.txt` - Database schema version for migrations
  `db/site-qa.db` - libSQL with vector search for issues, scenarios, runs
  `cache/` - Page manifests, DOM snapshots, screenshot hashes
  `tools/` - Helper scripts callable by agent

**Agent configurations (all installed, user chooses in config):**
`.claude/QA.md` - Complete instructions for Claude Code
`.gemini/QA.md` - Complete instructions for Gemini CLI
`.codex/QA.md` - Complete instructions for Codex
`.local/QA.md` - Template for local AI (Ollama, LM Studio, etc)
Template-based generation during init, all agents available

**Session output:**
`runs/YYYY-MM-DD_HH-mm-ss/` - Session folders (agent write sandbox)
Each contains: report.pdf, summary.json, screenshots/, session.log

---

## Configuration Management

All configuration happens via direct file editing. No CLI commands required after initialization.

### Primary Config: xswarm-qa.config.json5

JSON5 format allows comments and trailing commas. Generated with extensive inline documentation during init.

**Key sections:**

**Site identification:**
Name, primary URL, additional domains list.

**Authentication:**
Initially set to `required: false` for audit-only mode. To enable authenticated testing, edit config to set `required: true` and add credentials to `.env.local`:
```
AUTH_USERNAME=test@example.com
AUTH_PASSWORD=your-password
```

**Update detection:**
Strategy type, endpoint configuration, validation parameters. Change strategy anytime by editing config.

**Scheduling:**
Frequency, rapid development flag. Affects cache expiration and test depth.

**Agent selection:**
Type (claude-code, gemini-cli, codex, local-ai, custom), command, flags including `--yolo` for autonomous operation. For local AI, specify model endpoint and parameters.

**Local AI configuration example:**
For users running Ollama, LM Studio, or similar local inference servers:
```
agent: {
  type: "local-ai",
  command: "curl",
  endpoint: "http://localhost:11434/api/generate",
  model: "llama3:70b",
  // Or use a custom script wrapper
  // command: "./local-agent-wrapper.sh"
}
```
Local AI requires custom wrapper script to translate between agent protocol and local model API. Template provided but requires user configuration based on their local setup.

**OpenClawd integration:**
Enabled status, job ID. Added during init if OpenClawd detected.

**Notifications:**
Type (webhook, file-signal, none), URL, payload template with variable substitution.

### Changes Take Effect Immediately

Next `check-and-run.sh` execution reads current config. No restart or rebuild required. Agent instructions in `.claude/QA.md` check for auth config changes on each run.

### Configuration Template

Full example with comments showing all available options generated during init. Users customize by editing directly. Comments explain purpose and valid values for each field.

---

## Update Mechanism

Running `npx xswarm-qa` on existing folder checks for updates and offers upgrade.

### Version Detection

On invocation, check `.xswarm-qa/version.txt` against latest xSwarm QA release. If behind, offer update. If ahead or equal, skip to main flow.

### Update Flow

**Backup current infrastructure:**
Copy `.xswarm-qa/` to `.xswarm-qa.backup/` with timestamp. Preserve for rollback if update fails.

**Replace infrastructure:**
Download and extract latest `.xswarm-qa/` contents. Replace tools, update database schema, refresh agent configs.

**Database migrations:**
Check `schema-version.txt`. If schema changed, run migrations automatically. Migrations are idempotent and versioned. Example: v2 → v3 adds performance metrics table.

**Agent config updates:**
Regenerate `.claude/`, `.gemini/`, `.codex/` folders with latest templates. Preserve any user customizations by merging, not replacing.

**Preserve user data:**
Never touch `xswarm-qa.config.json5`, `.env.local`, or `runs/` during updates. User configuration and credentials untouched. Reports and history preserved.

**Changelog display:**
Show new features, improvements, and breaking changes. Link to full release notes.

**Verification:**
Offer optional test run to verify update succeeded. Quick health check ensures database accessible, tools functional, agent configs valid.

**Rollback capability:**
If update fails or user wants to revert, restore from `.xswarm-qa.backup/`. Simple folder swap operation.

### Schema Migrations

Stored in `.xswarm-qa/migrations/` as numbered SQL files:
- `001-initial.sql` - Base schema
- `002-add-scenarios.sql` - Scenario tracking
- `003-performance-metrics.sql` - Performance data

Track applied migrations in database. Apply only new migrations on update. All migrations tested for both upgrade and downgrade paths.

### Multi-Agent Installation

Initial setup installs configs for all supported cloud agents (Claude Code, Gemini CLI, Codex) plus local AI template. User selects default in `xswarm-qa.config.json5`. Switching agents requires only config edit, no reinstallation.

Local AI template includes `.local/QA.md` instructions and example wrapper script. Requires user customization based on their local inference setup (Ollama, LM Studio, vLLM, etc). Documentation explains adaptation for different local model APIs.

Updates refresh all agent configs together. New agent types added automatically when xSwarm QA updated. Legacy agents preserved if no longer officially supported.

---

## Agent Instructions

The `.claude/QA.md` file serves as the complete brain for autonomous operation.

### Autonomous Operation Requirement

For unattended OpenClawd cron jobs, Claude Code must run with `--yolo` flag (or equivalent autonomous mode). This disables confirmation prompts for navigation, screenshots, and file operations. Safety ensured through instruction boundaries and technical constraints, not human oversight.

Local AI agents may require additional configuration for autonomous operation depending on their CLI interface. Template includes guidance for common local inference servers.

The `.claude/QA.md` header includes: "You are running in autonomous mode. Execute all tasks without requesting human confirmation."

### Workflow Definition

**First run (empty database):**
Explore site to understand purpose. Infer user goals from navigation, content, and features. Generate 5-10 realistic scenarios. Calculate time budget based on site size (2.5 min per page, 60 min hard cap). Execute scenarios across viewports. Store all learnings in database.

**Subsequent runs (knowledge exists):**
Check what changed via cache headers. Load previous scenarios and issues from database. Test for regressions on known issues. Quick exploration for new features. Evolve scenario list based on changes. Prune scenarios fixed for 30+ days.

### Testing Dimensions

Test each scenario across:
- Desktop (1440px), tablet (768px), mobile (375px)
- Mouse interaction and keyboard-only navigation
- Light mode and dark mode
- Different browsers (if time permits)
- Screen reader accessibility tree inspection

### Issue Categories

**Bugs:** Broken functionality, errors, crashes
**UX issues:** Confusion, unclear flows, poor affordances
**Accessibility:** WCAG violations, keyboard traps, missing ARIA
**SEO problems:** Missing metadata, poor structure
**Performance:** Slow loads, FOUC, layout shifts
**Security:** Basic audit findings (not penetration testing)

### Reporting Subjective Experience

Explicitly report confusion: "It was not obvious how to filter results." Flag visual glitches: "Flash of unstyled content on page load." Note interaction inconsistencies: "Copy worked with context menu but Ctrl+C did not." Document unclear instructions: "No indication of how to open a book."

### Safety Constraints

Write only to `runs/<session-id>/` directory. All other paths read-only. Never submit forms with destructive actions. Never create real data or trigger actual emails. Use test credentials only. Stay within allocated time budget.

---

## Token Efficiency Strategy

### Caching Layer

**Page manifests with headers:**
Check ETags and Last-Modified before fetching. Store content hashes as fallback. Cache DOM summaries, not raw HTML. Reuse cached assets within session.

**Screenshot differentials:**
Hash images before capture. Skip if identical to previous session. Only capture when issues detected or significant changes.

### DOM Summarization

Extract structured metadata instead of full HTML:
- Page title, URL, meta tags
- Heading hierarchy (h1-h6)
- Form structure (fields, actions, validation)
- Navigation links
- Console errors and warnings
- Accessibility tree summary

Typical page: 500 tokens summarized vs 50k raw HTML.

### Vector Deduplication

Before logging new issue, query database for semantic similarity. Reuse existing issue IDs when applicable. Only describe truly new problems. Reference previous issues by ID in prompts.

### Session Context

Claude Code maintains conversation across pages. Initial prompt includes full context. Subsequent prompts reference "current page" without restating goals. No need to re-explain site purpose or issue schema.

### Estimated Efficiency

Naive approach: 80k tokens per page, 1.6M tokens for 20-page site.
xSwarm QA: 2k tokens per page, 60k tokens for 20-page site.
**26x reduction** through compression, caching, and deduplication.

---

## Update Detection

Pluggable strategy system defined in config. Each strategy implements check function returning version string and changed boolean.

**Version endpoint:**
GET configured URL, extract version from JSON via path (e.g. `.version` or `.data.build`). Compare to `.last-version` file.

**RSS monitoring:**
Fetch RSS feed, check Last-Modified header or latest item date. Compare to previous check.

**Sitemap checksum:**
Download sitemap.xml, compute SHA-256 hash. Detect changes via hash comparison.

**Homepage hash:**
Fetch homepage HTML, hash content. Ignore dynamic elements like timestamps.

**Manual trigger:**
No automatic detection. Run only when explicitly invoked.

Store strategy choice and parameters in config. Validate during setup that strategy will work. Cache last detected version in `.xswarm-qa/.last-version` for comparison on subsequent runs.

---

## Execution Flow

### Check and Run Script

Entry point for both manual and automated runs. Reads from `.xswarm-qa/` infrastructure folder for tools, database, and cached state. Implements:

**Change detection:**
Execute configured strategy using `.xswarm-qa/tools/check-update.js`. Exit early if no changes detected (unless forced). Update `.xswarm-qa/.last-version` on changes.

**Session creation:**
Generate timestamp-based folder. Create within `runs/` directory. Set environment variables for sandbox pointing to session path.

**Agent invocation:**
Spawn configured agent (from `xswarm-qa.config.json5`) with appropriate preset file (`.claude/QA.md`, `.gemini/QA.md`, etc) and `--yolo` flag for autonomous operation. Pass session folder as writable path via environment variables. Pass `.xswarm-qa/tools/` path for agent tool access. Stream output to session log.

**Completion handling:**
Verify report generation in session folder. Execute notification strategy via `.xswarm-qa/tools/notify.js`. Return appropriate exit code.

### OpenClawd Integration

**Cron job format:**
Schedule based on user choice during setup. Command: `cd <qa-folder> && ./check-and-run.sh`. Support version-based triggers.

**Manual triggers:**
OpenClawd can invoke script directly. Support forced runs ignoring change detection. Pass trigger source to agent context.

**Notification payloads:**
Webhook POST with JSON containing site name, session ID, status, issue counts, report path. File signal writes same data to `.signal` file. Email uses configured SMTP if available.

**Resilience:**
Exit cleanly if QA folder deleted. Don't crash OpenClawd on errors. Log issues to session folder for debugging.

---

## Database Schema

libSQL with vector search extension enabled.

**Runs table:**
Track each QA session with ID, timestamps, version tested, trigger source, agent used, page count, issue count, session path.

**Issues table:**
Stable key (hash of url + type + selector + summary stem). First and last seen run IDs. Type and severity classification. Status (open, resolved, flaky, wontfix). Full details with suggestion. Evidence path to screenshots. Embedding vector for semantic search. Metadata JSON for viewport, user action, etc.

**Scenarios table:**
Generated user scenarios with description, steps, last tested timestamp, stability score. Archive scenarios with no issues for 30+ days.

**Run-issues join table:**
Link runs to issues with status (appeared, resolved, unchanged). Enables regression tracking and trend analysis.

**Vector index:**
On issues.embedding for similarity search. Threshold 0.85 for duplicate detection.

---

## Report Generation

Professional PDF output suitable for client delivery.

### Structure

**Cover page:**
Site name, URL, version, test date, agent used, pages tested.

**Executive summary:**
Count of new issues by severity. Resolved issues since last run. Total open issues with breakdown. Trend indicators (improving, stable, declining).

**Issues addressed section:**
Previously logged issues now resolved. Before/after descriptions. Verification notes.

**New issues section:**
Issues discovered this run. Grouped by severity (critical, major, minor, suggestions). Each with URL, description, evidence screenshot, suggested fix.

**Existing issues section:**
Still-open items from previous runs. Age indication (first seen date). Updated status if changed.

**Category analyses:**
Accessibility narrative with WCAG references. SEO findings with recommendations. Performance observations with metrics. Usability commentary on flows and affordances.

**Appendix:**
Full scenario list. Coverage map showing what was tested. Technical details (browsers, viewports, etc).

### Companion Files

`summary.json` - Machine-readable stats for integrations
`session.log` - Full agent conversation
`screenshots/` - All evidence images
`dom-snapshots/` - Saved page states for debugging

---

## Multi-Site Support

### Agency Workflow

Create QA folders for each client. Use consistent naming (client-domain-com). OpenClawd manages all schedules centrally. Batch reporting across portfolio optional future feature.

### Namespace Isolation

Each site completely independent. No shared state between sites. Deletion of one site doesn't affect others. Easy to archive or remove completed projects.

---

## Security & Privacy

### Defense-in-Depth Architecture

Multiple layers ensure production safety, especially critical for yolo mode operation where Claude Code acts autonomously without human confirmation.

**Layer 1: Instruction Boundaries**
`.claude/QA.md` explicitly defines allowed operations: "You may ONLY write to runs/<session>/. All other paths read-only. Never submit forms. Never POST data. Never create real records. Never trigger emails."

**Layer 2: Tool Validation**
All file operations go through tools in `tools/` directory. Each tool validates paths before writing. Reject any operation outside `runs/<session>/`. Tools are the only write mechanism available to agent.

**Layer 3: Environment Constraints**
`check-and-run.sh` sets `ALLOWED_WRITE_PATH` environment variable to session folder only. Working directory confined to QA folder. Tools check environment variables before executing.

**Layer 4: Filesystem Permissions**
OS-level read-only permissions on everything except `runs/` directory. Even if validation fails, filesystem prevents writes. QA folder owned by restricted user account.

**Layer 5: Network Restrictions (Optional)**
If supported by agent: block HTTP POST/PUT/DELETE methods, allow only GET requests. Prevent form submissions at network layer.

**Layer 6: Isolated Test Credentials**
Test accounts with minimal permissions. Even accidental actions affect only isolated test data. Separate from production users and admin accounts.

### Yolo Mode Safety

Yolo mode means "don't ask permission" but does NOT mean "ignore instructions." Claude Code in yolo mode:
- Still follows instructions in `.claude/QA.md`
- Still respects tool constraints
- Still limited by filesystem permissions
- Simply operates without confirmation prompts

Critical for unattended operation via OpenClawd cron jobs where no human available to approve actions.

### Credential Handling

Store in `.env.local` per site. Never in config or code. Automatically gitignored during init. Support environment variable override for CI/CD. Session tokens cached in `cache/auth-session.json` (also gitignored). Clear cache on credential removal.

### Production Safety

Read-only by default on external sites. Write sandbox enforced via environment variables. Tool validation of all file paths. No destructive actions (deletes, posts to production forms). Test account isolation from real users. Consultant can audit competitor sites safely.

### Data Retention

All site data contained in QA folder. Easy complete deletion via folder removal. No cloud storage or external transmission except configured webhooks. Credentials never leave local machine. Reports stored locally only unless explicitly shared.

---

## Future Extensibility

### Additional Agent Types

Beyond Claude Code, Gemini CLI, Codex, and local AI support, future specialized agents can be added via template system. Abstract tool calling interface supports any agent with file operations and tool use capability. Model selection within agent type (e.g., Claude Sonnet vs Opus, Llama 3 70B vs 405B).

### Framework Detection

Auto-detect Next.js, Astro, Rails, Laravel. Smart route discovery based on framework. Framework-specific test suggestions.

### Integration Hooks

Export to Linear, GitHub Issues, Jira. Slack/Discord notifications. Email digest reports. Dashboard UI for multi-site overview.

### Advanced Features

axe-core deep accessibility scanning. Visual regression testing. Performance profiling integration. API endpoint testing. Mobile app support via simulators.

---

## Success Metrics

### Quality Indicators

Issues caught before production. False positive rate (target <10%). Issue resolution rate improvement. Time to detection for regressions.

### Efficiency Metrics

Token usage per run. Cost per site per month. Time to completion. Cache hit rates.

### Adoption Metrics

Sites under management. Reports generated. OpenClawd job success rate. User retention.

---

## Implementation Phases

### Phase 1: Core Foundation (Week 1-2)

CLI scaffold with interview flow. Version detection and update checking. JSON5 config generation with extensive comments. Config validation. Folder structure with `.xswarm-qa/` infrastructure. Multi-agent config installation (Claude, Gemini, Codex, local AI template). Tool stubs. Simple check-and-run script.

### Phase 2: Claude Code Integration (Week 2-3)

`.claude/QA.md` template. Tool implementations (DB, cache, notify). First autonomous run. Basic PDF report generation.

### Phase 3: Intelligence Layer (Week 3-4)

libSQL schema with vectors. Issue deduplication. Scenario evolution. Caching strategy. Token optimization.

### Phase 4: OpenClawd Integration & Updates (Week 4-5)

Auto-detection and setup. Cron job creation. Webhook notifications. Manual trigger support. Resilience testing. Update mechanism with version checking. Schema migration system. Backup and rollback capability. Multi-agent switching support.

### Phase 5: Polish & Dogfooding (Week 5-6)

Run on Ocean Library, WholeReader. Refine prompts and scenarios. Improve report quality. Performance optimization. Documentation.

### Phase 6: Public Release (Week 6+)

npm package publication. README and examples. Video demo. Community feedback. Iteration based on real usage.

---

## Open Questions

**Authentication complexity:**
How to handle OAuth flows, 2FA, CAPTCHAs? Start with basic auth, iterate?

**Large site strategy:**
Sites with 500+ pages - sample intelligently or user-defined scope?

**Reporting customization:**
White-label option for consultants? Custom branding in PDFs?

**Competitive analysis mode:**
Should we explicitly support testing competitor sites? Legal considerations?

**Local AI performance:**
Minimum recommended model size and hardware specs? Quantization trade-offs? Should we benchmark and recommend specific local models for QA tasks?

---

## Next Actions

Design ASCII art logo matching Claude Code aesthetic. Create skeleton repo with package.json and folder structure including `.xswarm-qa/` infrastructure. Implement version tracking and update detection logic. Build interview flow with review/modify capability. Generate multi-agent configs (Claude, Gemini, Codex) during init. Create first `.claude/QA.md` template and test manually. Research OpenClawd notification API and webhook format.

---

**Document Status:** Draft for implementation
**Target Audience:** Claude Code for autonomous development
**Next Review:** After Phase 1 completion