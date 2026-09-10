// Templates are emitted as text, so nothing but a test notices when they stop parsing.
import { describe, it, expect } from 'vitest';
import { gitignore, envLocal, config, checkAndRun, agentQA, checkUpdateTool, notifyTool } from '../src/templates.js';

const a = {
  url: 'https://example.com', authMode: 'audit', loginUrl: '', username: '', authPassword: '',
  strategy: 'manual', strategyConfig: {}, agent: 'claude',
  openclaw: false, cronSchedule: '', openclawNotify: false,
  focus: ['seo', 'performance'], depth: 'standard',
};

// The generated tools ship their own JSON5 reader. Extract the real one out of the
// emitted source and run it against a real emitted config — the two must agree, and a
// bare //-strip in that reader silently truncated every https:// url.
const emittedReadConfig = (toolSrc) => {
  const body = toolSrc.match(/const readConfig = \(path\) => \{[\s\S]*?\n\};/)[0];
  return new Function('readFileSync', `${body}; return readConfig;`)(() => config(a));
};

describe('config()', () => {
  it('is readable by the parser the generated tools actually ship', () => {
    for (const [name, src] of [['check-update', checkUpdateTool()], ['notify', notifyTool()]]) {
      const parsed = emittedReadConfig(src)('ignored');
      expect(parsed.site.url, name).toBe('https://example.com');
    }
  });

  it('survives a url containing // without being truncated at the scheme', () => {
    const parsed = emittedReadConfig(checkUpdateTool())('ignored');
    expect(parsed.site.url).toContain('://');
  });

  it('falls back to a placeholder host rather than throwing on an unparseable url', () => {
    expect(() => config({ ...a, url: 'not a url' })).not.toThrow();
  });
});

describe('checkAndRun()', () => {
  it('starts with a shebang so the cron entry can exec it', () => {
    expect(checkAndRun(a).startsWith('#!/usr/bin/env bash')).toBe(true);
  });
  it('supports the documented --force flag that skips change detection', () => {
    expect(checkAndRun(a)).toContain('--force');
  });
});

describe('envLocal()', () => {
  it('carries the credentials and warns against committing them', () => {
    const text = envLocal({ ...a, authMode: 'auth', username: 'qa@example.com', authPassword: 'sekrit' });
    expect(text).toContain('sekrit');
    expect(text).toMatch(/NEVER commit/i);
  });
});

describe('gitignore()', () => {
  it('ignores the credentials file', () => {
    expect(gitignore()).toContain('.env.local');
  });
});

describe('agentQA()', () => {
  it('emits instructions for every agent the interview offers', () => {
    for (const agent of ['claude', 'gemini', 'codex', 'local']) {
      const text = agentQA(agent, a);
      expect(typeof text).toBe('string');
      expect(text.length).toBeGreaterThan(100);
    }
  });
});

describe('bundled tools', () => {
  it('emit syntactically valid node scripts', async () => {
    const { default: vm } = await import('vm');
    for (const [name, src] of [['check-update', checkUpdateTool()], ['notify', notifyTool()]]) {
      expect(src.startsWith('#!/usr/bin/env node'), name).toBe(true);
      expect(() => new vm.Script(src.replace(/^#!.*\n/, '')), name).not.toThrow();
    }
  });
});
