// Argument handling in run(). Every path here is non-interactive; the interview itself
// is covered by driving it end-to-end in generate.test.js.
import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { run } from '../src/cli.js';
import { createRequire } from 'module';

const pkg = createRequire(import.meta.url)('../package.json');

let out, realLog;
beforeEach(() => { out = []; realLog = console.log; console.log = (...a) => out.push(a.join(' ')); });
afterEach(() => { console.log = realLog; });
const text = () => out.join('\n').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

let sandbox;
beforeAll(async () => { sandbox = await mkdtemp(join(tmpdir(), 'xswarm-qa-cli-')); });
afterAll(async () => { await rm(sandbox, { recursive: true, force: true }); });

describe('--version', () => {
  it('prints the package version and nothing else', async () => {
    await run(['--version']);
    expect(text().trim()).toBe(pkg.version);
  });
});

describe('help', () => {
  it('is shown for --help', async () => {
    await run(['--help']);
    expect(text()).toContain('USAGE');
  });

  it('is shown when no folder is given, rather than failing', async () => {
    await run([]);
    expect(text()).toContain('USAGE');
  });

  it('wins over a folder argument, so --help never creates anything', async () => {
    await run(['some-folder', '--help']);
    expect(text()).toContain('USAGE');
    expect(text()).not.toContain('Creating QA workspace');
  });
});

describe('existing workspace', () => {
  it('refuses to touch a directory that already holds a workspace', async () => {
    const dir = join(sandbox, 'already');
    await mkdir(join(dir, '.xswarm-qa'), { recursive: true });
    await writeFile(join(dir, '.xswarm-qa', 'version.txt'), '1.0.0', 'utf8');

    const cwd = process.cwd();
    process.chdir(sandbox);
    try {
      await run(['already']);
    } finally {
      process.chdir(cwd);
    }
    expect(text()).toContain('Existing workspace detected');
    // It must stop before the interview — nothing was regenerated.
    expect(text()).not.toContain('Creating QA workspace');
  });
});

describe('flag parsing', () => {
  it('treats a flag as a flag and never as the folder name', async () => {
    // --version is a flag, so there is no positional and no workspace is created.
    await run(['--version', '--dry-run']);
    expect(text().trim()).toBe(pkg.version);
  });
});
