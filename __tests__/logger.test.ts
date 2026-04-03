/**
 * Tests for fix #23: Structured logger (src/lib/logger.ts)
 */

import { logger } from '@/lib/logger';

describe('logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('logs info as valid JSON to stdout', () => {
    logger.info('test message', { userId: '123' });
    expect(console.log).toHaveBeenCalledTimes(1);
    const output = (console.log as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('test message');
    expect(parsed.userId).toBe('123');
    expect(parsed.ts).toBeDefined();
  });

  it('logs errors to stderr', () => {
    logger.error('something broke', { code: 500 });
    expect(console.error).toHaveBeenCalledTimes(1);
    const output = (console.error as jest.Mock).mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.level).toBe('error');
  });

  it('logs warn to stderr', () => {
    logger.warn('watch out');
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it('suppresses debug in production', () => {
    const original = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', configurable: true });
    logger.debug('verbose debug');
    expect(console.log).not.toHaveBeenCalled();
    Object.defineProperty(process.env, 'NODE_ENV', { value: original, configurable: true });
  });
});
