// Supporting an agent means four places agreeing: the interview's AGENTS list, the
// AGENT_HEADERS map, the runner's case branches, and the QA.md files generate() writes.
// Miss one and it fails quietly — agentQA falls through to the local-ai header, or the
// runner lands in its `*)` branch and exits 1 on a perfectly valid config.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { generate } from '../src/generate.js';

// Read the list out of the source rather than importing it: exporting AGENTS purely
// for this test would add an export nothing in src/ imports, which is real debt to
// carry for a test's convenience.
const interviewSrc = readFileSync(new URL('../src/interview.js', import.meta.url), 'utf8');
const agentsBlock = interviewSrc.match(/const AGENTS = \[([\s\S]*?)\];/);
const VALUES = agentsBlock ? [...agentsBlock[1].matchAll(/value: '([^']+)'/g)].map((m) => m[1]) : [];

let sandbox;
const dirs = new Map();

beforeAll(async () => {
  sandbox = await mkdtemp(join(tmpdir(), 'xswarm-qa-contract-'));
  for (const agent of VALUES) {
    const dir = join(sandbox, agent);
    await generate(dir, {
      url: 'https://example.com', domains: '', authMode: 'audit', loginUrl: '',
      username: '', authPassword: '', strategy: 'manual', strategyConfig: {},
      rapidDev: false, frequency: 'daily', agent,
      openclaw: false, cronSchedule: '', openclawNotify: false,
    }, { dryRun: false, version: 'test' });
    dirs.set(agent, dir);
  }
}, 30000);

afterAll(async () => { await rm(sandbox, { recursive: true, force: true }); });

it('the interview offers at least the four documented agents', () => {
  // Also guards the parse above: if AGENTS moves or changes shape, this fails loudly
  // rather than silently checking an empty list.
  expect(VALUES).toEqual(expect.arrayContaining(['claude-code', 'gemini-cli', 'codex', 'local-ai']));
});

describe.each(VALUES)('%s', (agent) => {
  it('round-trips through the config', () => {
    const out = execFileSync(process.execPath, ['.xswarm-qa/tools/config-get.js', 'agent.type'],
      { cwd: dirs.get(agent), encoding: 'utf8' });
    expect(out.trim()).toBe(agent);
  });

  it('has its own branch in the runner', async () => {
    const sh = await readFile(join(dirs.get(agent), 'check-and-run.sh'), 'utf8');
    expect(sh).toMatch(new RegExp(`^\\s*${agent}\\)`, 'm'));
  });

  it('gets a QA.md written for it', async () => {
    const qa = await readFile(join(dirs.get(agent), `.${agent.split('-')[0]}/QA.md`), 'utf8')
      .catch(() => null);
    // .claude/ .gemini/ .codex/ .local/ — the directory is named for the first segment.
    expect(qa, `no QA.md directory for ${agent}`).toBeTruthy();
    expect(qa.length).toBeGreaterThan(200);
  });
});

it('gives every agent a header of its own, not the local-ai fallback', async () => {
  const firstLines = new Map();
  for (const agent of VALUES) {
    const dir = dirs.get(agent);
    const qa = await readFile(join(dir, `.${agent.split('-')[0]}/QA.md`), 'utf8');
    firstLines.set(agent, qa.split('\n')[0]);
  }
  // A missing AGENT_HEADERS entry silently reuses the local-ai header, so identical
  // first lines across two agents is the symptom to catch.
  expect(new Set(firstLines.values()).size).toBe(VALUES.length);
});
