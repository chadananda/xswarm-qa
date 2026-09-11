// The two CommonJS scripts dropped into .xswarm-qa/tools/: update detection and
// notification. Both embed READ_CONFIG_SRC, the one copy of the JSON5 reader.

// ── Update Detection Tool ───────────────────────────────────
// Standalone Node.js script (CommonJS — no package.json dependency).
// Called by check-and-run.sh. Exit 0 = changed, exit 1 = unchanged.
// Emitted verbatim into both generated tools. Defined once here because this reader
// already shipped one bug (a bare //-strip truncated every https:// url), and a
// second copy is a second place to miss the next one.
const READ_CONFIG_SRC = `// Minimal JSON5 reader: strip comments + trailing commas → JSON.parse.
// Must skip string literals — a bare //-strip truncated every https:// url.
const readConfig = (path) => {
  const raw = readFileSync(path, 'utf8');
  let out = '', inStr = false, esc = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; out += c; continue; }
    if (c === '/' && raw[i + 1] === '/') { while (i < raw.length && raw[i] !== '\\n') i++; out += '\\n'; continue; }
    if (c === '/' && raw[i + 1] === '*') { i += 2; while (i < raw.length && !(raw[i] === '*' && raw[i + 1] === '/')) i++; i++; continue; }
    out += c;
  }
  return JSON.parse(out.replace(/,(\\s*[}\\]])/g, '$1'));
};`;

export const checkUpdateTool = () => `#!/usr/bin/env node
// xSwarm QA — Update Detection
// Compares current site state against .xswarm-qa/.last-version
// to decide whether a QA session is warranted.
//
// Exit 0 = changes detected → run QA
// Exit 1 = no changes → skip

const { readFileSync, writeFileSync, existsSync } = require('fs');

${READ_CONFIG_SRC}

// Quick non-crypto hash for string comparison
const hash = (s) => { let h = 0; for (const c of s) h = ((h << 5) - h + c.charCodeAt(0)) | 0; return h.toString(36); };

const LAST = '.xswarm-qa/.last-version';

(async () => {
  const config = readConfig('xswarm-qa.config.json5');
  const { strategy } = config.updates;

  if (strategy === 'manual') process.exit(1);

  const prev = existsSync(LAST) ? readFileSync(LAST, 'utf8').trim() : '';
  let curr = '';

  if (strategy === 'version-endpoint') {
    const res = await fetch(config.updates.endpoint);
    const data = await res.json();
    curr = config.updates.jsonPath.split('.').filter(Boolean).reduce((o, k) => o?.[k], data)?.toString() || '';
  } else if (strategy === 'rss') {
    const res = await fetch(config.updates.feedUrl);
    curr = res.headers.get('last-modified') || hash(await res.text());
  } else if (strategy === 'sitemap') {
    const res = await fetch(new URL('/sitemap.xml', config.site.url));
    curr = hash(await res.text());
  } else if (strategy === 'homepage-hash') {
    const res = await fetch(config.site.url);
    // Strip nonce/timestamp elements for stable comparison
    curr = hash((await res.text()).replace(/<script[^>]*nonce[^>]*>[\\s\\S]*?<\\/script>/g, ''));
  }

  if (curr) writeFileSync(LAST, curr, 'utf8');

  // First run (no baseline) → always run QA
  if (!prev) process.exit(0);

  if (curr && curr !== prev) process.exit(0);
  process.exit(1);
})().catch(() => process.exit(1));
`;

// ── Notification Tool ───────────────────────────────────────
// Sends alerts after session completion. Supports webhook + file signal.
export const notifyTool = () => `#!/usr/bin/env node
// xSwarm QA — Post-session Notifications
// Usage: node notify.js <session-path>
//
// Reads notification config and sends alerts via the configured method.
// Failures are non-fatal (check-and-run.sh ignores exit code).

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

${READ_CONFIG_SRC}

(async () => {
  const session = process.argv[2];
  if (!session) { console.error('Usage: notify.js <session-path>'); process.exit(1); }

  const config = readConfig('xswarm-qa.config.json5');
  const { type, url } = config.notifications;
  if (type === 'none') return;

  const summaryPath = join(session, 'summary.json');
  const payload = existsSync(summaryPath)
    ? JSON.parse(readFileSync(summaryPath, 'utf8'))
    : { site: config.site.name, session, status: 'completed' };

  if (type === 'webhook' && url) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'qa-session-complete', ...payload }),
    });
    console.log('  Webhook:', res.status);
  } else if (type === 'file-signal') {
    writeFileSync('.signal', JSON.stringify(payload, null, 2));
    console.log('  Signal file written: .signal');
  }
})().catch(e => console.error('  Notification failed:', e.message));
`;
