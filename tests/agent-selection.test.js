// The runner picks which AI agent to invoke by reading agent.type out of the JSON5
// config. That read used to be an inline //-stripper inside a bash `node -e`, which
// truncated the https:// site url, threw, and fell through to a catch that printed
// "claude-code". Every workspace configured for gemini-cli, codex or local-ai silently
// ran Claude Code instead — while the README advertised agent switching as a one-line
// config change.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync, execFileSync } from 'child_process';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generate } from '../src/generate.js';

const AGENTS = ['claude-code', 'gemini-cli', 'codex', 'local-ai'];

let sandbox;
const dirs = new Map();

beforeAll(async () => {
  sandbox = await mkdtemp(join(tmpdir(), 'xswarm-qa-agent-'));
  for (const agent of AGENTS) {
    const dir = join(sandbox, agent);
    await generate(dir, {
      url: 'https://example.com', authMode: 'audit', loginUrl: '', username: '', authPassword: '',
      strategy: 'manual', strategyConfig: {}, agent,
      openclaw: false, cronSchedule: '', openclawNotify: false,
      rapidDev: false, frequency: 'daily',
    }, { dryRun: false, version: 'test' });
    dirs.set(agent, dir);
  }
}, 30000);

afterAll(async () => { await rm(sandbox, { recursive: true, force: true }); });

describe.each(AGENTS)('%s', (agent) => {
  it('is what config-get reports', () => {
    const out = execFileSync(process.execPath, ['.xswarm-qa/tools/config-get.js', 'agent.type'],
      { cwd: dirs.get(agent), encoding: 'utf8' });
    expect(out.trim()).toBe(agent);
  });

  it('is what the runner actually resolves AGENT to', async () => {
    // Lift the real AGENT= assignment out of the shipped script and run it in the real
    // workspace, so this fails if the runner goes back to parsing the config itself.
    const sh = await readFile(join(dirs.get(agent), 'check-and-run.sh'), 'utf8');
    const assignment = sh.match(/^AGENT=[\s\S]*?\n(?=[A-Z#\n])/m);
    expect(assignment, 'no AGENT= assignment found in check-and-run.sh').toBeTruthy();
    const { stdout } = spawnSync('bash', ['-c', `${assignment[0]}\necho "$AGENT"`],
      { cwd: dirs.get(agent), encoding: 'utf8' });
    expect(stdout.trim()).toBe(agent);
  });
});

describe('config-get', () => {
  it('reads a nested path without tripping over the site url', () => {
    const out = execFileSync(process.execPath, ['.xswarm-qa/tools/config-get.js', 'site.url'],
      { cwd: dirs.get('codex'), encoding: 'utf8' });
    expect(out.trim()).toBe('https://example.com');
  });

  it('exits non-zero on a path that is not there, rather than printing nothing quietly', () => {
    const r = spawnSync(process.execPath, ['.xswarm-qa/tools/config-get.js', 'nope.missing'],
      { cwd: dirs.get('codex'), encoding: 'utf8' });
    expect(r.status).toBe(1);
  });
});

describe('the runner', () => {
  it('no longer parses JSON5 with an inline regex stripper', async () => {
    const sh = await readFile(join(dirs.get('codex'), 'check-and-run.sh'), 'utf8');
    expect(sh).not.toMatch(/replace\(\/\\\/\\\/\.\*\$\/gm/);
    expect(sh).toContain('config-get.js agent.type');
  });

  it('does not discard the tools\' stderr, the only clue an unattended run leaves', async () => {
    const sh = await readFile(join(dirs.get('codex'), 'check-and-run.sh'), 'utf8');
    expect(sh).not.toMatch(/check-update\.js 2>\/dev\/null/);
    expect(sh).not.toMatch(/notify\.js "\$SESSION" 2>\/dev\/null/);
  });
});
