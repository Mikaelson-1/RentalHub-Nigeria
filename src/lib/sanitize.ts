/**
 * lib/sanitize.ts
 *
 * Lightweight text sanitisation helpers.
 * React's JSX renderer already escapes HTML in text nodes, so these are
 * defence-in-depth for any code path that might use dangerouslySetInnerHTML
 * or construct raw HTML strings.
 */

function stripHtml(raw: string): string {
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '');
}

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

/**
 * Allow only http/https URLs.
 * Rejects javascript:, data:, file:, and malformed values.
 */
export function sanitizeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function sanitizeHttpUrlArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => sanitizeHttpUrl(value))
    .filter((value): value is string => Boolean(value));
}

/**
 * V24/V25 fix: only accept paths that point to our own file-access-controlled
 * endpoint. Anything else (picsum.photos, someone's S3, attacker webserver) is
 * rejected — eliminates the "submit-a-fake-ID-URL" verification bypass.
 *
 * Expected format: "/api/files/uploads/<category>/<filename>"
 */
export function sanitizeInternalBlobPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Must be a same-origin relative path to /api/files, with no traversal.
  if (!trimmed.startsWith("/api/files/uploads/")) return null;
  if (trimmed.includes("..") || trimmed.includes("\\")) return null;

  // Path segment whitelist — matches uploads/<category>/<id>.ext shape.
  const segments = trimmed.slice("/api/files/".length).split("/");
  if (segments.length < 3) return null;
  if (segments[0] !== "uploads") return null;
  for (const seg of segments) {
    if (!/^[a-zA-Z0-9._\-]+$/.test(seg)) return null;
  }
  return trimmed;
}
