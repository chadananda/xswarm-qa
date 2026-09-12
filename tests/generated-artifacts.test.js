// The generated workspace IS the product, and it is emitted as strings — so nothing but
// a test notices when a template starts producing output that will not parse. Both bugs
// found in this repo so far (a shell-injected cron registration, and a JSON5 reader that
// truncated every https:// url) were invisible to every other kind of check.
//
// Sweeps the answer combinations that actually change the emitted text.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generate } from '../src/generate.js';

const STRATEGIES = ['version-endpoint', 'rss', 'sitemap', 'homepage-hash', 'manual'];
const AGENTS = ['claude-code', 'gemini-cli', 'codex', 'local-ai'];
const AUTH_MODES = ['audit', 'auth'];

const strategyConfigFor = (strategy) =>
  strategy === 'version-endpoint' ? { endpoint: 'https://example.com/v.json', jsonPath: '.version' }
  : strategy === 'rss' ? { feedUrl: 'https://example.com/feed.xml' }
  : {};

const answersFor = (strategy, authMode, agent) => ({
  url: 'https://example.com', authMode,
  loginUrl: authMode === 'auth' ? 'https://example.com/login' : '',
  username: authMode === 'auth' ? 'qa@example.com' : '',
  authPassword: authMode === 'auth' ? 'correct-horse-battery' : '',
  strategy, strategyConfig: strategyConfigFor(strategy), agent,
  openclaw: false, cronSchedule: '', openclawNotify: false,
  focus: ['seo', 'performance'], depth: 'standard', folderName: 'demo-qa',
});

const COMBOS = [];
for (const strategy of STRATEGIES)
  for (const authMode of AUTH_MODES)
    for (const agent of AGENTS)
      COMBOS.push({ strategy, authMode, agent });

let sandbox;
const built = new Map();

beforeAll(async () => {
  sandbox = await mkdtemp(join(tmpdir(), 'xswarm-qa-artifacts-'));
  let n = 0;
  for (const c of COMBOS) {
    const dir = join(sandbox, `w${n++}`);
    await generate(dir, answersFor(c.strategy, c.authMode, c.agent), { dryRun: false, version: 'test' });
    built.set(`${c.strategy}/${c.authMode}/${c.agent}`, dir);
  }
}, 60000);

afterAll(async () => { await rm(sandbox, { recursive: true, force: true }); });

// Pull the reader the generated tool actually ships and run it, rather than
// re-implementing the stripping here — the point is to test what users get.
const emittedReadConfig = (toolSrc) => {
  const body = toolSrc.match(/const readConfig = \(path\) => \{[\s\S]*?\n\};/)[0];
  return new Function('readFileSync', `${body}; return readConfig;`)(
    (p) => readFileSync(p, 'utf8'));
};

describe.each(COMBOS)('$strategy / $authMode / $agent', ({ strategy, authMode, agent }) => {
  const dir = () => built.get(`${strategy}/${authMode}/${agent}`);

  it('emits a check-and-run.sh bash will parse', () => {
    expect(() => execFileSync('bash', ['-n', join(dir(), 'check-and-run.sh')], { stdio: 'pipe' })).not.toThrow();
  });

  it('emits tools node will parse', () => {
    for (const t of ['check-update', 'notify']) {
      expect(() => execFileSync(process.execPath, ['--check', join(dir(), '.xswarm-qa/tools', `${t}.js`)],
        { stdio: 'pipe' }), t).not.toThrow();
    }
  });

  it('emits a config its own shipped reader can parse', async () => {
    const tool = await readFile(join(dir(), '.xswarm-qa/tools/check-update.js'), 'utf8');
    const cfg = emittedReadConfig(tool)(join(dir(), 'xswarm-qa.config.json5'));
    expect(cfg.site.url).toBe('https://example.com');
    expect(cfg.updates.strategy).toBe(strategy);
  });

  it('keeps the password out of everything except the gitignored env file', async () => {
    const secret = 'correct-horse-battery';
    for (const f of ['xswarm-qa.config.json5', 'check-and-run.sh', 'README.md']) {
      expect(await readFile(join(dir(), f), 'utf8'), f).not.toContain(secret);
    }
    const env = await readFile(join(dir(), '.env.local'), 'utf8');
    if (authMode === 'auth') expect(env).toContain(secret);
    else expect(env).not.toContain(secret);
  });
});

describe('the shipped JSON5 reader', () => {
  const dir = () => built.get('manual/audit/claude-code');

  it('is byte-identical in every tool that carries it', async () => {
    const bodies = [];
    for (const t of ['check-update', 'notify', 'config-get']) {
      const src = await readFile(join(dir(), '.xswarm-qa/tools', `${t}.js`), 'utf8');
      const m = src.match(/const readConfig = \(path\) => \{[\s\S]*?\n\};/);
      expect(m, `${t}.js has no readConfig`).toBeTruthy();
      bodies.push(m[0]);
    }
    // Three copies that drift are how the //-strip bug survived in check-and-run.sh
    // after both tools had been fixed.
    expect(new Set(bodies).size).toBe(1);
  });

  it('appears nowhere as a bare regex strip', async () => {
    for (const f of ['check-and-run.sh', '.xswarm-qa/tools/check-update.js',
                     '.xswarm-qa/tools/notify.js', '.xswarm-qa/tools/config-get.js']) {
      const src = await readFile(join(dir(), f), 'utf8');
      expect(src, f).not.toMatch(/replace\(\/\\\/\\\/\.\*\$\/gm/);
    }
  });

  it('gives the notify webhook a deadline too', async () => {
    const src = await readFile(join(dir(), '.xswarm-qa/tools/notify.js'), 'utf8');
    expect(src).toMatch(/AbortSignal\.timeout/);
  });
});
