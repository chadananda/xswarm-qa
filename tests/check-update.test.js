// check-update.js decides whether a QA session runs at all. It is invoked from cron with
// nobody watching, so its failure modes matter more than its happy path: a silent exit 1
// is indistinguishable from "site unchanged", and QA just quietly stops happening.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnSync } from 'child_process';
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generate } from '../src/generate.js';

let sandbox;
beforeAll(async () => { sandbox = await mkdtemp(join(tmpdir(), 'xswarm-qa-update-')); });
afterAll(async () => { await rm(sandbox, { recursive: true, force: true }); });

const build = async (name, strategy, strategyConfig = {}) => {
  const dir = join(sandbox, name);
  await generate(dir, {
    url: 'https://example.com', authMode: 'audit', loginUrl: '', username: '', authPassword: '',
    strategy, strategyConfig, agent: 'claude-code',
    openclaw: false, cronSchedule: '', openclawNotify: false,
    rapidDev: false, frequency: 'daily',
  }, { dryRun: false, version: 'test' });
  return dir;
};

const runTool = (dir) =>
  spawnSync(process.execPath, ['.xswarm-qa/tools/check-update.js'],
    { cwd: dir, encoding: 'utf8', timeout: 30000 });

describe('check-update exit codes', () => {
  it('skips immediately on the manual strategy', async () => {
    const dir = await build('manual', 'manual');
    expect(runTool(dir).status).toBe(1);
  });
});

describe('check-update failure reporting', () => {
  // 127.0.0.1:1 refuses instantly — a network failure without a slow test.
  const DEAD = 'http://127.0.0.1:1/v.json';

  it('exits 1 when the version endpoint is unreachable', async () => {
    const dir = await build('dead', 'version-endpoint', { endpoint: DEAD, jsonPath: '.version' });
    expect(runTool(dir).status).toBe(1);
  });

  it('says why, instead of failing silently', async () => {
    const dir = await build('dead-msg', 'version-endpoint', { endpoint: DEAD, jsonPath: '.version' });
    const { stderr } = runTool(dir);
    expect(stderr).toMatch(/check-update failed/);
    expect(stderr.trim().length).toBeGreaterThan(20);
  });

  it('does not record a baseline it never successfully fetched', async () => {
    const dir = await build('no-baseline', 'version-endpoint', { endpoint: DEAD, jsonPath: '.version' });
    runTool(dir);
    await expect(readFile(join(dir, '.xswarm-qa/.last-version'), 'utf8')).rejects.toThrow();
  });
});

describe('check-update fetch deadline', () => {
  it('gives every request a timeout, so a hung endpoint cannot wedge cron forever', async () => {
    const dir = await build('timeout', 'homepage-hash');
    const src = await readFile(join(dir, '.xswarm-qa/tools/check-update.js'), 'utf8');
    expect(src).toMatch(/AbortSignal\.timeout/);
    // and no bare fetch( that bypasses it
    expect(src).not.toMatch(/await fetch\(/);
  });
});
