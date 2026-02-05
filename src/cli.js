import chalk from 'chalk';
import gradient from 'gradient-string';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { interview } from './interview.js';
import { generate } from './generate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

// Block-character X paired with box-drawing SWARM QA — distinctive at any terminal width.
// Renders in warm amber gradient via gradient-string for xSwarm brand consistency.
const LOGO = `
  ██╗  ██╗
  ╚██╗██╔╝  ╔═╗╦ ╦╔═╗╦═╗╔╦╗  ╔═╗╔═╗
   ╚███╔╝   ╚═╗║║║╠═╣╠╦╝║║║  ║═╣╠═╣
   ██╔██╗   ╚═╝╚╩╝╩ ╩╩╚═╩ ╩  ╚═╝╩ ╩
  ██╔╝ ██╗
  ╚═╝  ╚═╝`;

const brand = gradient(['#ff6b35', '#ffa726', '#ffcc80']);

export function printLogo() {
  console.log(brand(LOGO));
  console.log(chalk.dim(`  v${pkg.version} · Autonomous AI Quality Assurance · xswarm.ai\n`));
}

function printHelp() {
  printLogo();
  console.log(`
  ${chalk.bold('USAGE')}
    ${chalk.cyan('npx xswarm-qa <folder-name>')}    Create a QA workspace
    ${chalk.cyan('npx xswarm-qa')}                  Show this help

  ${chalk.bold('WHAT IT DOES')}
    Creates a self-contained workspace that AI agents use to
    autonomously test any web application. No integration, no
    test scripts — just a URL and an AI agent of your choice.

    ${chalk.yellow('→')} Explores your app like a real user
    ${chalk.yellow('→')} Generates and evolves realistic test scenarios
    ${chalk.yellow('→')} Tests across viewports, themes, and input modes
    ${chalk.yellow('→')} Tracks issues with semantic deduplication
    ${chalk.yellow('→')} Produces professional audit reports

  ${chalk.bold('AGENTS')}  ${chalk.dim('(all installed, switch via config file)')}
    Claude Code     Best exploratory testing (OAuth, recommended)
    Gemini CLI      Fast, cost-effective automated runs
    Codex           Code-focused QA and analysis
    Local AI        Ollama, LM Studio, etc. (custom setup)

  ${chalk.bold('EXAMPLES')}
    ${chalk.cyan('npx xswarm-qa my-app-qa')}             New workspace
    ${chalk.cyan('npx xswarm-qa client-site-qa')}         One per client
    ${chalk.cyan('npx xswarm-qa demo --dry-run')}         Preview only

  ${chalk.bold('OPTIONS')}
    --dry-run    Show what would be created (no writes)
    --version    Print version number
    --help       Show this help

  ${chalk.dim('Docs: https://github.com/chadananda/xswarm-qa')}
  ${chalk.dim('Site: https://xswarm.ai')}
`);
}

export async function run(args) {
  const flags = new Set(args.filter(a => a.startsWith('--')));
  const positional = args.filter(a => !a.startsWith('--'));

  if (flags.has('--version')) return console.log(pkg.version);
  if (flags.has('--help') || !positional.length) return printHelp();

  const folderName = positional[0];
  const folderPath = resolve(process.cwd(), folderName);

  printLogo();

  // Existing workspace → future update flow
  if (existsSync(resolve(folderPath, '.xswarm-qa', 'version.txt'))) {
    console.log(chalk.yellow(`  ⚠ Existing workspace detected at ${folderName}/`));
    console.log(chalk.dim('  Update mechanism coming in a future release.\n'));
    return;
  }

  console.log(chalk.bold(`  Creating QA workspace: ${chalk.cyan(folderName)}/\n`));

  const answers = await interview({ folderName });
  if (!answers) return console.log(chalk.dim('\n  Setup cancelled.\n'));

  await generate(folderPath, { ...answers, folderName }, { dryRun: flags.has('--dry-run'), version: pkg.version });
}
