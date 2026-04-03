/**
 * lib/sanitize.ts
 *
 * Lightweight text sanitisation helpers.
 * React's JSX renderer already escapes HTML in text nodes, so these are
 * defence-in-depth for any code path that might use dangerouslySetInnerHTML
 * or construct raw HTML strings.
 */

/** Strip every HTML tag — and the inner content of script/style blocks — from a string. */
export function stripHtml(raw: string): string {
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '');
}

/**
 * Sanitise a user-supplied string for safe display:
 * – removes HTML tags
 * – trims whitespace
 * – caps length (default 10 000 chars)
 */
export function sanitizeText(raw: string, maxLength = 10_000): string {
  return stripHtml(raw).trim().slice(0, maxLength);
}

/**
 * Sanitise an array of user-supplied strings (e.g. amenities list).
 * Each item is stripped and limited to 200 characters.
 */
export function sanitizeStringArray(items: unknown[]): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is string => typeof item === 'string')
    .map((item) => sanitizeText(item, 200));
}
