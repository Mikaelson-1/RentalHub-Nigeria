/**
 * Tests for fix #3: XSS sanitization helpers (src/lib/sanitize.ts)
 */

import { stripHtml, sanitizeText, sanitizeStringArray } from '@/lib/sanitize';

describe('stripHtml', () => {
  it('removes script tags', () => {
    expect(stripHtml('<script>alert("xss")</script>hello')).toBe('hello');
  });

  it('removes all HTML tags', () => {
    expect(stripHtml('<b>bold</b> and <em>italic</em>')).toBe('bold and italic');
  });

  it('leaves plain text unchanged', () => {
    expect(stripHtml('plain text with no tags')).toBe('plain text with no tags');
  });

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
  });
});

describe('sanitizeText', () => {
  it('strips HTML and trims whitespace', () => {
    expect(sanitizeText('  <b>hello</b>  ')).toBe('hello');
  });

  it('enforces max length', () => {
    const long = 'a'.repeat(200);
    expect(sanitizeText(long, 10)).toHaveLength(10);
  });

  it('defaults to 10000 char limit', () => {
    const overLimit = 'x'.repeat(10_001);
    expect(sanitizeText(overLimit)).toHaveLength(10_000);
  });

  it('handles XSS payloads in descriptions', () => {
    const xss = '<img src=x onerror="alert(1)">Nice house';
    expect(sanitizeText(xss)).toBe('Nice house');
  });
});

describe('sanitizeStringArray', () => {
  it('filters out non-string items', () => {
    expect(sanitizeStringArray([1, null, 'WiFi', undefined, 'Water'])).toEqual(['WiFi', 'Water']);
  });

  it('strips HTML from each item', () => {
    expect(sanitizeStringArray(['<script>bad</script>WiFi', 'Water'])).toEqual(['WiFi', 'Water']);
  });

  it('caps each item at 200 chars', () => {
    const long = 'a'.repeat(300);
    const result = sanitizeStringArray([long]);
    expect(result[0]).toHaveLength(200);
  });

  it('returns empty array for non-array input', () => {
    expect(sanitizeStringArray('not an array' as unknown as unknown[])).toEqual([]);
  });
});
