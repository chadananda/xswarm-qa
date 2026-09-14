// check-and-run.sh is the entry point cron calls, and until now nothing ever executed
// it. Running it with a stub agent on PATH is the only way to see the behaviour that
// matters: what happens when the agent fails, and whether anyone is told.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtemp, rm, writeFile, chmod, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generate } from '../src/generate.js';

let sandbox, binDir;

const stubAgent = async (exitCode, message = 'stub agent') => {
  await writeFile(join(binDir, 'claude'),
    `#!/usr/bin/env bash\necho "${message}"\nexit ${exitCode}\n`, 'utf8');
  await chmod(join(binDir, 'claude'), 0o755);
};

const makeWorkspace = async (name, { notifications = 'none', strategy = 'manual' } = {}) => {
  const dir = join(sandbox, name);
  await generate(dir, {
    url: 'https://example.com', authMode: 'audit', loginUrl: '', username: '', authPassword: '',
    strategy, strategyConfig: {}, agent: 'claude-code',
    openclaw: false, cronSchedule: '', openclawNotify: false,
    rapidDev: false, frequency: 'daily',
  }, { dryRun: false, version: 'test' });
  if (notifications !== 'none') {
    const cfgPath = join(dir, 'xswarm-qa.config.json5');
    const cfg = await readFile(cfgPath, 'utf8');
    await writeFile(cfgPath, cfg.replace('"type": "none"', `"type": "${notifications}"`), 'utf8');
  }
  return dir;
};

const runRunner = (dir, args = []) =>
  spawnSync('./check-and-run.sh', args, {
    cwd: dir, encoding: 'utf8', timeout: 30000,
    env: { ...process.env, PATH: `${binDir}:${process.env.PATH}` },
  });

beforeAll(async () => {
  sandbox = await mkdtemp(join(tmpdir(), 'xswarm-qa-runner-'));
  binDir = join(sandbox, 'bin');
  await mkdir(binDir, { recursive: true });
}, 30000);

afterAll(async () => { await rm(sandbox, { recursive: true, force: true }); });

describe('a successful run', () => {
  it('exits 0, logs the session, and says it completed', async () => {
    await stubAgent(0);
    const dir = await makeWorkspace('ok');
    const r = runRunner(dir, ['--force']);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('Session complete');
    const log = (r.stdout.match(/Session: (runs\/[^\s]+)/) || [])[1];
    expect(existsSync(join(dir, log, 'session.log'))).toBe(true);
  });
});

describe('a failing agent', () => {
  it('propagates the agent exit code rather than reporting success', async () => {
    await stubAgent(7, 'boom');
    const dir = await makeWorkspace('fail');
    expect(runRunner(dir, ['--force']).status).toBe(7);
  });

  it('says so on stderr and points at the log', async () => {
    await stubAgent(7, 'boom');
    const dir = await makeWorkspace('fail-msg');
    const r = runRunner(dir, ['--force']);
    expect(r.stderr).toMatch(/Session FAILED/);
    expect(r.stderr).toMatch(/session\.log/);
  });

  it('still notifies — going quiet on failure is the one thing a watchdog must not do', async () => {
    await stubAgent(7, 'boom');
    const dir = await makeWorkspace('fail-notify', { notifications: 'file-signal' });
    runRunner(dir, ['--force']);
    const signal = JSON.parse(await readFile(join(dir, '.signal'), 'utf8'));
    expect(signal.status).toBe('failed');
  });

  it('captures the agent output into the session log', async () => {
    await stubAgent(7, 'boom');
    const dir = await makeWorkspace('fail-log');
    const r = runRunner(dir, ['--force']);
    const log = (r.stdout.match(/Session: (runs\/[^\s]+)/) || [])[1];
    expect(await readFile(join(dir, log, 'session.log'), 'utf8')).toContain('boom');
  });
});

describe('notifications', () => {
  it('writes the signal file with a completed status on success', async () => {
    await stubAgent(0);
    const dir = await makeWorkspace('sig', { notifications: 'file-signal' });
    runRunner(dir, ['--force']);
    const signal = JSON.parse(await readFile(join(dir, '.signal'), 'utf8'));
    expect(signal.status).toBe('completed');
    expect(signal.site).toBe('example.com');
  });

  it('does not crash when the type is none', async () => {
    await stubAgent(0);
    const dir = await makeWorkspace('none');
    const r = runRunner(dir, ['--force']);
    // The config had no notifications section at all until 2026-09-13, and notify.js
    // threw destructuring it on every single run.
    expect(r.stdout + r.stderr).not.toMatch(/Notification failed/);
    expect(r.status).toBe(0);
  });
});

describe('update detection', () => {
  it('skips cleanly with exit 0 when the manual strategy says nothing changed', async () => {
    await stubAgent(0);
    const dir = await makeWorkspace('skip');
    const r = runRunner(dir, []);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('No changes detected');
    expect(r.stdout).not.toContain('Session complete');
  });
});
