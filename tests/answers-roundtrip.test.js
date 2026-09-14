// Every question the interview asks costs the user something, so every answer it
// collects has to reach the workspace. A dropped answer is silent: the user configures
// something, the run ignores it, and nothing anywhere says so.
//
// The answer keys below are exactly what src/interview.js returns — url, domains,
// authMode, loginUrl, username, authPassword, strategy, strategyConfig, rapidDev,
// frequency, agent, openclaw, cronSchedule, openclawNotify. Keep them in step.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generate } from '../src/generate.js';

let sandbox;
let n = 0;
beforeAll(async () => { sandbox = await mkdtemp(join(tmpdir(), 'xswarm-qa-answers-')); });
afterAll(async () => { await rm(sandbox, { recursive: true, force: true }); });

const ANSWERS = {
  url: 'https://example.com',
  domains: 'a.example.com, b.example.com',
  authMode: 'auth',
  loginUrl: 'https://example.com/login',
  username: 'qa@example.com',
  authPassword: 'correct-horse-battery',
  strategy: 'version-endpoint',
  strategyConfig: { endpoint: 'https://example.com/v.json', jsonPath: '.build.version' },
  rapidDev: true,
  frequency: 'daily',
  agent: 'codex',
  openclaw: true,
  cronSchedule: '17 3 * * *',
  openclawNotify: true,
};

const build = async (over = {}) => {
  const dir = join(sandbox, `w${n++}`);
  await generate(dir, { ...ANSWERS, ...over }, { dryRun: false, version: 'test' });
  return dir;
};

const get = (dir, path) =>
  execFileSync(process.execPath, ['.xswarm-qa/tools/config-get.js', path],
    { cwd: dir, encoding: 'utf8' }).trim();

let full;
beforeAll(async () => { full = await build(); }, 30000);

describe('every collected answer reaches the workspace', () => {
  it.each([
    ['site.url', 'https://example.com'],
    ['auth.required', 'true'],
    ['auth.loginUrl', 'https://example.com/login'],
    ['updates.strategy', 'version-endpoint'],
    ['updates.endpoint', 'https://example.com/v.json'],
    ['updates.jsonPath', '.build.version'],
    ['schedule.rapidDevelopment', 'true'],
    ['schedule.frequency', 'daily'],
    ['agent.type', 'codex'],
    ['openclaw.enabled', 'true'],
    ['openclaw.cronSchedule', '17 3 * * *'],
    ['openclaw.notifyOnReport', 'true'],
  ])('%s', (path, expected) => {
    expect(get(full, path)).toBe(expected);
  });

  it('puts the credentials in .env.local and nowhere else', async () => {
    const env = await readFile(join(full, '.env.local'), 'utf8');
    expect(env).toContain('qa@example.com');
    expect(env).toContain('correct-horse-battery');
    const cfg = await readFile(join(full, 'xswarm-qa.config.json5'), 'utf8');
    expect(cfg).not.toContain('correct-horse-battery');
  });

  it('records the extra domains as a list', async () => {
    const cfg = await readFile(join(full, 'xswarm-qa.config.json5'), 'utf8');
    expect(cfg).toContain('"domains": ["a.example.com", "b.example.com"]');
  });
});

describe('audit mode', () => {
  it('records auth as not required and carries no credentials', async () => {
    const dir = await build({ authMode: 'audit', loginUrl: '', username: '', authPassword: '' });
    expect(get(dir, 'auth.required')).toBe('false');
    const env = await readFile(join(dir, '.env.local'), 'utf8');
    expect(env).not.toContain('correct-horse-battery');
  });
});

describe('the domains list', () => {
  // A trailing or doubled comma is the normal typo in a free-text list, and "" is not
  // a domain the agent should be asked to test.
  it.each([
    ['a.com,b.com', '["a.com", "b.com"]'],
    ['a.com, b.com', '["a.com", "b.com"]'],
    ['a.com,', '["a.com"]'],
    ['a.com,,b.com', '["a.com", "b.com"]'],
    ['   ', '[]'],
    ['', '[]'],
    [', ,', '[]'],
  ])('normalises %j', async (domains, expected) => {
    const dir = await build({ domains });
    const cfg = await readFile(join(dir, 'xswarm-qa.config.json5'), 'utf8');
    expect(cfg).toContain(`"domains": ${expected}`);
  });

  it('survives a domain containing a quote', async () => {
    const dir = await build({ domains: 'a.com, we"ird.com' });
    expect(get(dir, 'site.url')).toBe('https://example.com');
  });
});
