/**
 * lib/env.ts
 *
 * Validates that required environment variables are set at startup.
 * Import this module in layout.tsx or instrumentation.ts so failures
 * surface immediately rather than at runtime in a specific route.
 */

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
] as const;

export function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Check your .env file or deployment environment.',
    );
  }

  const secret = process.env.NEXTAUTH_SECRET!;
  if (secret.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters long.');
  }
}

// Run validation when this module is first imported (server-side, non-test).
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  validateEnv();
}
