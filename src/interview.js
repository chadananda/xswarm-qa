import chalk from 'chalk';
import { input, select, confirm, password } from '@inquirer/prompts';
import { execSync } from 'child_process';

// ── Validation ──────────────────────────────────────────────
// Format-only check. Actual reachability tested during QA runs, not setup
// (avoids blocking on slow DNS or firewalled dev servers).
const normalizeUrl = s => /^https?:\/\//i.test(s) ? s : `https://${s}`;
const looksLikeDomain = s => /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(s);

const validUrl = s => {
  try { new URL(normalizeUrl(s)); return true; }
  catch { return 'Enter a valid URL (example.com)'; }
};

// ── Choice Definitions ──────────────────────────────────────
// Centralized so the summary display can look up labels by value.

const STRATEGIES = [
  { name: 'Version endpoint — poll a JSON API for build version', value: 'version-endpoint' },
  { name: 'RSS feed — watch for new published entries',          value: 'rss' },
  { name: 'Sitemap checksum — hash sitemap.xml for changes',     value: 'sitemap' },
  { name: 'Homepage hash — detect any visible content change',   value: 'homepage-hash' },
  { name: 'Manual only — run only when explicitly triggered',    value: 'manual' },
];

const AGENTS = [
  { name: 'Claude Code — best exploratory testing, OAuth (recommended)', value: 'claude-code' },
  { name: 'Gemini CLI — fast and cost-effective',                        value: 'gemini-cli' },
  { name: 'Codex — code-focused QA and analysis',                       value: 'codex' },
  { name: 'Local AI — Ollama, LM Studio, etc. (custom setup)',          value: 'local-ai' },
];

const FREQUENCIES = [
  { name: 'On change detected', value: 'on-change' },
  { name: 'Daily',              value: 'daily' },
  { name: 'Weekly',             value: 'weekly' },
  { name: 'Manual only',        value: 'manual' },
];

const CRON_SCHEDULES = [
  { name: 'Every hour',      value: '0 * * * *' },
  { name: 'Every 6 hours',   value: '0 */6 * * *' },
  { name: 'Daily at 7 AM',   value: '0 7 * * *' },
  { name: 'Weekly (Mon 7 AM)', value: '0 7 * * 1' },
];

// Map the frequency answer from Stage 3 to a sensible cron default
const frequencyToCron = (freq) => ({
  'on-change': '0 * * * *',
  'daily':     '0 7 * * *',
  'weekly':    '0 7 * * 1',
  'manual':    '0 7 * * *',
})[freq] || '0 7 * * *';

// ── Stage Labels ────────────────────────────────────────────
const NAMES = [
  'Site Configuration', 'Authentication', 'Update Detection',
  'Change Detection Schedule', 'Agent Selection', 'OpenClaw Integration',
];

const header = (n) => {
  console.log(`\n  ${chalk.bold(`Stage ${n + 1} of 6`)} ${chalk.dim('·')} ${chalk.bold(NAMES[n])}`);
  console.log(chalk.dim('  ' + '─'.repeat(44)));
};

// ── Stage Functions ─────────────────────────────────────────
// Each receives accumulated answers, returns new fields to merge.
// Defaults pre-fill from previous answers (enables back-editing).

const stages = [
  async (a) => {
    header(0);
    const raw = await input({ message: 'Primary URL to test:', default: a.url || a._urlDefault, validate: validUrl });
    return {
      url:     normalizeUrl(raw),
      domains: await input({ message: 'Additional domains (comma-separated, optional):', default: a.domains || '' }),
    };
  },

  // Audit-only is the safe, zero-friction default
  async (a) => {
    header(1);
    const authMode = await select({
      message: 'Testing mode:',
      choices: [
        { name: 'Audit only — public pages, no login', value: 'audit' },
        { name: 'Authenticated — test with login credentials', value: 'auth' },
      ],
      default: a.authMode,
    });
    if (authMode === 'audit') return { authMode, loginUrl: '', username: '', authPassword: '' };
    const loginUrl = normalizeUrl(await input({ message: 'Login URL:', default: a.loginUrl, validate: validUrl }));
    const username = await input({ message: 'Test username:', default: a.username });
    const authPassword = await password({ message: 'Test password:' });
    console.log(chalk.dim('  ↳ Credentials stored in .env.local (gitignored). Never committed.'));
    return { authMode, loginUrl, username, authPassword };
  },

  // Strategy-specific follow-up questions only when needed
  async (a) => {
    header(2);
    const strategy = await select({ message: 'How to detect site updates?', choices: STRATEGIES, default: a.strategy });
    const strategyConfig = { ...a.strategyConfig };
    if (strategy === 'version-endpoint') {
      strategyConfig.endpoint = normalizeUrl(await input({ message: 'Version endpoint URL:', default: strategyConfig.endpoint, validate: validUrl }));
      strategyConfig.jsonPath = await input({ message: 'JSON path (e.g. .version):', default: strategyConfig.jsonPath || '.version' });
    } else if (strategy === 'rss') {
      strategyConfig.feedUrl = normalizeUrl(await input({ message: 'RSS feed URL:', default: strategyConfig.feedUrl, validate: validUrl }));
    }
    return { strategy, strategyConfig };
  },

  async (a) => {
    header(3);
    return {
      rapidDev:  await confirm({ message: 'Site in rapid development?', default: a.rapidDev ?? false }),
      frequency: await select({ message: 'How often to check for changes:', choices: FREQUENCIES, default: a.frequency }),
    };
  },

  async (a) => {
    header(4);
    console.log(chalk.dim('  All agent configs installed. Switch later via config file.'));
    return { agent: await select({ message: 'Default AI agent:', choices: AGENTS, default: a.agent }) };
  },

  // Auto-detect OpenClaw binary; offer cron job + report notification
  async (a) => {
    header(5);
    const detected = (() => { try { execSync('which openclaw', { stdio: 'ignore' }); return true; } catch { return false; } })();
    if (!detected) {
      console.log(chalk.dim('  OpenClaw not found on PATH. Skipping.'));
      console.log(chalk.dim('  Install OpenClaw later and re-run setup to enable.'));
      return { openclaw: false, cronSchedule: '', openclawNotify: false };
    }
    console.log(chalk.green('  ✓ OpenClaw detected'));
    const openclaw = await confirm({ message: 'Register an OpenClaw cron job for this workspace?', default: a.openclaw ?? true });
    if (!openclaw) return { openclaw: false, cronSchedule: '', openclawNotify: false };
    const cronSchedule = await select({
      message: 'Cron schedule:',
      choices: CRON_SCHEDULES,
      default: a.cronSchedule || frequencyToCron(a.frequency),
    });
    const openclawNotify = await confirm({ message: 'Notify OpenClaw when QA reports are ready?', default: a.openclawNotify ?? true });
    return { openclaw, cronSchedule, openclawNotify };
  },
];

// ── Summary ─────────────────────────────────────────────────
// Extract the short label before the em dash from choice definitions
const label = (choices, val) => (choices.find(c => c.value === val)?.name || val).split(' — ')[0];

function printSummary(a) {
  const rows = [
    ['Site',     a.url + (a.domains ? chalk.dim(` +${a.domains.split(',').length} domain(s)`) : '')],
    ['Auth',     a.authMode === 'auth' ? `${a.loginUrl} (${a.username})` : 'Audit only'],
    ['Updates',  label(STRATEGIES, a.strategy)],
    ['Check',    label(FREQUENCIES, a.frequency) + (a.rapidDev ? chalk.yellow(' ⚡ rapid') : '')],
    ['Agent',    label(AGENTS, a.agent)],
    ['OpenClaw',  a.openclaw
      ? `Cron: ${a.cronSchedule}` + (a.openclawNotify ? ' + notify on report' : '')
      : 'Not registered'],
  ];
  console.log(`\n  ${chalk.bold('Configuration Summary')}`);
  console.log(chalk.dim('  ' + '─'.repeat(50)));
  for (const [k, v] of rows) console.log(`  ${chalk.dim(k.padEnd(12))}${v}`);
  console.log();
}

// ── Main Interview Loop ─────────────────────────────────────
// Runs all 6 stages, then enters a review loop where the user can
// go back and edit any stage before confirming workspace creation.

export async function interview({ folderName } = {}) {
  const answers = {};
  if (folderName && looksLikeDomain(folderName)) answers._urlDefault = folderName;
  let i = 0;

  // Collect all stages — Ctrl+C at any point returns null
  try {
    while (i < stages.length) { Object.assign(answers, await stages[i](answers)); i++; }
  } catch { return null; }

  // Review loop: show summary, let user confirm or go back
  while (true) {
    printSummary(answers);
    try {
      const action = await select({
        message: 'Ready to create workspace?',
        choices: [
          { name: '✓ Create workspace', value: 'create' },
          { name: '← Modify a stage',   value: 'back' },
          { name: '✗ Cancel',            value: 'cancel' },
        ],
      });
      if (action === 'create') return answers;
      if (action === 'cancel') return null;
      const idx = await select({
        message: 'Which stage to revisit?',
        choices: NAMES.map((name, j) => ({ name: `${j + 1}. ${name}`, value: j })),
      });
      Object.assign(answers, await stages[idx](answers));
    } catch { return null; }
  }
}
