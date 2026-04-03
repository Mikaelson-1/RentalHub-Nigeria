/**
 * Next.js Instrumentation
 *
 * register() is called once when the server starts — never during `next build`.
 * Use this for startup-time validation and initialisation.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env');
    validateEnv();
  }
}
