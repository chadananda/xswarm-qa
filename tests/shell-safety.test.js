// Regression guard for the OpenClaw registration shell-injection fix.
//
// generate() used to build `openclaw cron add ...` as a template literal and hand it to
// execSync, so a workspace path, hostname or cron expression containing shell
// metacharacters was executed. These tests put a recording stub named `openclaw` on PATH
// and assert the arguments arrive as literal argv entries with no shell in between.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, writeFile, chmod, readFile, rm, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generate } from '../src/generate.js';

let sandbox, binDir, argvLog, originalPath;

beforeAll(async () => {
  sandbox = await mkdtemp(join(tmpdir(), 'xswarm-qa-shell-'));
  binDir = join(sandbox, 'bin');
  argvLog = join(sandbox, 'argv.json');
  await mkdtemp(binDir).catch(() => {});
  await import('fs/promises').then(fs => fs.mkdir(binDir, { recursive: true }));
  // Records its own argv, so we can see exactly what crossed the process boundary.
  await writeFile(join(binDir, 'openclaw'), `#!/usr/bin/env node
require('fs').appendFileSync(${JSON.stringify(argvLog)}, JSON.stringify(process.argv.slice(2)) + '\\n');
`, 'utf8');
  await chmod(join(binDir, 'openclaw'), 0o755);
  originalPath = process.env.PATH;
  process.env.PATH = `${binDir}:${originalPath}`;
});

afterAll(async () => {
  process.env.PATH = originalPath;
  await rm(sandbox, { recursive: true, force: true });
});

const answersWith = (over = {}) => ({
  url: 'https://example.com', authMode: 'audit', loginUrl: '', username: '', authPassword: '',
  strategy: 'manual', strategyConfig: {}, agent: 'claude',
  openclaw: true, cronSchedule: '0 3 * * *', openclawNotify: true,
  focus: ['seo'], depth: 'standard', ...over,
});

const records = async () =>
  (await readFile(argvLog, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);

describe('OpenClaw registration is not shell-interpreted', () => {
  it('passes a metacharacter-laden cron expression through as one literal argv entry', async () => {
    const root = join(sandbox, 'ws-cron');
    const hostile = '0 3 * * *"; touch ' + join(sandbox, 'pwned-cron') + '; echo "';
    await generate(root, answersWith({ cronSchedule: hostile }), { dryRun: false, version: 'test' });

    const calls = await records();
    const cronCall = calls.find(c => c[0] === 'cron');
    expect(cronCall).toBeDefined();
    // The whole hostile string survives as a single argument — not split, not executed.
    expect(cronCall[cronCall.indexOf('--cron') + 1]).toBe(hostile);
    // Nothing in it ran.
    expect(await readdir(sandbox)).not.toContain('pwned-cron');
  });

  it('passes a workspace path containing shell metacharacters through intact', async () => {
    const root = join(sandbox, 'ws ; touch ' + join(sandbox, 'pwned-path') + ' ;x');
    await generate(root, answersWith(), { dryRun: false, version: 'test' });

    const calls = await records();
    const cronCall = calls.reverse().find(c => c[0] === 'cron');
    const message = cronCall[cronCall.indexOf('--message') + 1];
    expect(message).toContain(root);
    expect(await readdir(sandbox)).not.toContain('pwned-path');
  });

  it('sends the notification text as one argument rather than an interpolated command', async () => {
    const root = join(sandbox, 'ws-notify');
    await generate(root, answersWith(), { dryRun: false, version: 'test' });

    const calls = await records();
    const eventCall = calls.reverse().find(c => c[0] === 'system' && c[1] === 'event');
    expect(eventCall).toBeDefined();
    const text = eventCall[eventCall.indexOf('--text') + 1];
    expect(text).toContain('example.com');
    // A single argv entry, so quoting in the message can never terminate a command.
    expect(eventCall).toContain('--mode');
  });

  it('never builds a child process command from a template literal', async () => {
    const src = await readFile(new URL('../src/generate.js', import.meta.url), 'utf8');
    expect(src).not.toMatch(/execSync\s*\(\s*`/);
    expect(src).toMatch(/execFileSync/);
  });
});
