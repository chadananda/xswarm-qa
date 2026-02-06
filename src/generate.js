import { mkdir, writeFile, chmod } from 'fs/promises';
import { join, basename, dirname, resolve } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import * as T from './templates.js';

/**
 * Create the full QA workspace from interview answers.
 * Dry-run mode prints the file manifest without touching disk.
 */
export async function generate(root, answers, { dryRun, version }) {
  // Complete file manifest: [relative-path, content, options?]
  // Every file the workspace needs lives here — single source of truth.
  const files = [
    ['.gitignore',                        T.gitignore()],
    ['.env.local',                        T.envLocal(answers)],
    ['xswarm-qa.config.json5',            T.config(answers)],
    ['check-and-run.sh',                  T.checkAndRun(answers), { mode: 0o755 }],
    ['.xswarm-qa/version.txt',            version],
    ['.xswarm-qa/schema-version.txt',     '1'],
    ['.claude/QA.md',                     T.agentQA('claude-code', answers)],
    ['.gemini/QA.md',                     T.agentQA('gemini-cli', answers)],
    ['.codex/QA.md',                      T.agentQA('codex', answers)],
    ['.local/QA.md',                      T.agentQA('local-ai', answers)],
    ['.xswarm-qa/tools/check-update.js',  T.checkUpdateTool()],
    ['.xswarm-qa/tools/notify.js',        T.notifyTool()],
    ['README.md',                         T.workspaceReadme(answers, version)],
  ];

  const dirs = [
    '.xswarm-qa/db', '.xswarm-qa/cache', '.xswarm-qa/tools',
    '.xswarm-qa/migrations', '.claude', '.gemini', '.codex', '.local', 'runs',
  ];

  // ── Dry Run ─────────────────────────────────────────────
  if (dryRun) {
    console.log(chalk.bold('\n  Dry run — would create:\n'));
    for (const d of dirs) console.log(chalk.dim(`    📁 ${d}/`));
    for (const [f] of files) console.log(`    📄 ${f}`);
    console.log(`\n  ${chalk.dim('No files written. Remove --dry-run to create workspace.')}\n`);
    return;
  }

  // ── Create Everything ───────────────────────────────────
  const spinner = ora({ text: 'Creating workspace...', color: 'yellow' }).start();

  for (const dir of dirs) await mkdir(join(root, dir), { recursive: true });
  for (const [file, content, opts] of files) {
    const fullPath = join(root, file);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf8');
    if (opts?.mode) await chmod(fullPath, opts.mode);
  }

  spinner.succeed(chalk.green('Workspace created successfully'));

  // ── OpenClaw Cron Registration ────────────────────────
  if (answers.openclaw && answers.cronSchedule) {
    const absPath = resolve(root);
    const host = new URL(answers.url).hostname;
    try {
      execSync(
        `openclaw cron add --name "xSwarm QA: ${host}" --cron "${answers.cronSchedule}" --session isolated --message "cd ${absPath} && ./check-and-run.sh"`,
        { stdio: 'pipe' },
      );
      console.log(chalk.green(`  ✓ OpenClaw cron job registered (${answers.cronSchedule})`));
    } catch (err) {
      console.log(chalk.yellow(`  ⚠ Failed to register OpenClaw cron job: ${err.message}`));
      console.log(chalk.dim(`    Run manually: openclaw cron add --name "xSwarm QA: ${host}" --cron "${answers.cronSchedule}" --session isolated --message "cd ${absPath} && ./check-and-run.sh"`));
    }
    // Notify OpenClaw's main session so it can inform the user
    try {
      execSync(
        `openclaw system event --text "xSwarm QA workspace created for ${host}. Cron schedule: ${answers.cronSchedule}. Workspace: ${absPath}. Please notify the user that automated QA is now active for this site." --mode now`,
        { stdio: 'pipe' },
      );
      console.log(chalk.green('  ✓ OpenClaw notified'));
    } catch {
      // Non-fatal — gateway may not be running yet
    }
  }

  // ── Next Steps ──────────────────────────────────────────
  const name = basename(root);
  const authNote = answers.authMode === 'auth' ? chalk.dim('# Verify credentials in .env.local\n    ') : '';
  console.log(`
  ${chalk.bold('Next steps:')}

    ${chalk.cyan(`cd ${name}`)}
    ${chalk.dim('# Review and edit xswarm-qa.config.json5')}
    ${authNote}${chalk.dim('# Run your first QA session:')}
    ${chalk.cyan('./check-and-run.sh')}

  ${chalk.dim('All agent configs installed (.claude/, .gemini/, .codex/, .local/).')}
  ${chalk.dim('Switch agents anytime in xswarm-qa.config.json5.')}
  ${chalk.dim('Docs: https://xswarm.ai')}
`);
}
