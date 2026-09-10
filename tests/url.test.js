// URL helpers from the interview: format-only validation, no network.
import { describe, it, expect } from 'vitest';
import { normalizeUrl, looksLikeDomain, validUrl } from '../src/interview.js';

describe('normalizeUrl', () => {
  it('adds https:// when no scheme is present', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });
  it('leaves an existing scheme alone, including http', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });
  it('treats the scheme test as case-insensitive', () => {
    expect(normalizeUrl('HTTPS://example.com')).toBe('HTTPS://example.com');
  });
});

describe('looksLikeDomain', () => {
  it('accepts ordinary and multi-label domains', () => {
    expect(looksLikeDomain('example.com')).toBe(true);
    expect(looksLikeDomain('qa.staging.example.co.uk')).toBe(true);
  });
  it('rejects bare words and anything with a scheme or path', () => {
    expect(looksLikeDomain('localhost')).toBe(false);
    expect(looksLikeDomain('https://example.com')).toBe(false);
    expect(looksLikeDomain('example.com/path')).toBe(false);
  });
});

describe('validUrl', () => {
  it('returns true for input the interview should accept', () => {
    expect(validUrl('example.com')).toBe(true);
    expect(validUrl('https://example.com/app')).toBe(true);
  });
  it('returns a human-readable message rather than false when invalid', () => {
    const r = validUrl('http://');
    expect(typeof r).toBe('string');
    expect(r).toMatch(/valid URL/);
  });
});
