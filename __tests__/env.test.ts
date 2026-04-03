/**
 * Tests for fix #21: Env var validation (src/lib/env.ts)
 */

import { validateEnv } from '@/lib/env';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('passes when all required vars are set', () => {
    process.env.DATABASE_URL    = 'postgresql://test';
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
    process.env.NEXTAUTH_URL    = 'http://localhost:3000';
    expect(() => validateEnv()).not.toThrow();
  });

  it('throws when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
    process.env.NEXTAUTH_URL    = 'http://localhost:3000';
    expect(() => validateEnv()).toThrow('DATABASE_URL');
  });

  it('throws when NEXTAUTH_SECRET is missing', () => {
    process.env.DATABASE_URL = 'postgresql://test';
    delete process.env.NEXTAUTH_SECRET;
    process.env.NEXTAUTH_URL = 'http://localhost:3000';
    expect(() => validateEnv()).toThrow('NEXTAUTH_SECRET');
  });

  it('throws when NEXTAUTH_SECRET is too short', () => {
    process.env.DATABASE_URL    = 'postgresql://test';
    process.env.NEXTAUTH_SECRET = 'short';
    process.env.NEXTAUTH_URL    = 'http://localhost:3000';
    expect(() => validateEnv()).toThrow('32 characters');
  });

  it('throws listing all missing vars', () => {
    delete process.env.DATABASE_URL;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_URL;
    expect(() => validateEnv()).toThrow('DATABASE_URL');
  });
});
