// Workspace generation: what lands on disk, and what must never land on disk.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, readFile, stat, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { generate } from '../src/generate.js';

let sandbox;
beforeAll(async () => { sandbox = await mkdtemp(join(tmpdir(), 'xswarm-qa-gen-')); });
afterAll(async () => { await rm(sandbox, { recursive: true, force: true }); });

const baseAnswers = (over = {}) => ({
  url: 'https://example.com', authMode: 'audit', loginUrl: '', username: '', authPassword: '',
  strategy: 'manual', strategyConfig: {}, agent: 'claude',
  openclaw: false, cronSchedule: '', openclawNotify: false,
  focus: ['seo'], depth: 'standard', ...over,
});

describe('generate()', () => {
  it('writes nothing at all in dry-run mode', async () => {
    const root = join(sandbox, 'dry');
    await generate(root, baseAnswers(), { dryRun: true, version: 'test' });
    await expect(stat(root)).rejects.toThrow();
  });

  it('creates the workspace with a config for every supported agent', async () => {
    const root = join(sandbox, 'full');
    await generate(root, baseAnswers(), { dryRun: false, version: 'test' });
    for (const f of ['README.md', 'check-and-run.sh', 'xswarm-qa.config.json5', '.env.local', '.gitignore']) {
      await expect(stat(join(root, f))).resolves.toBeDefined();
    }
    // Agent choice is switchable after setup, so all four configs ship every time.
    for (const d of ['.claude', '.gemini', '.codex', '.local']) {
      await expect(stat(join(root, d, 'QA.md'))).resolves.toBeDefined();
    }
  });

  it('makes the runner executable, since the cron entry invokes it directly', async () => {
    const root = join(sandbox, 'mode');
    await generate(root, baseAnswers(), { dryRun: false, version: 'test' });
    const { mode } = await stat(join(root, 'check-and-run.sh'));
    expect(mode & 0o111).toBeTruthy();
  });

  it('keeps credentials out of the committed config and gitignores the env file', async () => {
    const root = join(sandbox, 'creds');
    const secret = 'hunter2-not-in-config';
    await generate(root, baseAnswers({
      authMode: 'auth', loginUrl: 'https://example.com/login',
      username: 'qa@example.com', authPassword: secret,
    }), { dryRun: false, version: 'test' });

    const config = await readFile(join(root, 'xswarm-qa.config.json5'), 'utf8');
    expect(config).not.toContain(secret);

    const gitignore = await readFile(join(root, '.gitignore'), 'utf8');
    expect(gitignore).toContain('.env.local');

    // The password belongs in .env.local and only there.
    expect(await readFile(join(root, '.env.local'), 'utf8')).toContain(secret);
  });

  it('is idempotent — regenerating over an existing workspace succeeds', async () => {
    const root = join(sandbox, 'again');
    await generate(root, baseAnswers(), { dryRun: false, version: 'test' });
    const before = (await readdir(root)).sort();
    await generate(root, baseAnswers(), { dryRun: false, version: 'test' });
    expect((await readdir(root)).sort()).toEqual(before);
  });
});
