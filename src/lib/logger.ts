/**
 * lib/logger.ts
 *
 * Structured JSON logger for server-side code.
 * In production the output can be ingested by any log aggregator.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level:   LogLevel;
  message: string;
  ts:      string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return;

  const entry: LogEntry = {
    level,
    message,
    ts: new Date().toISOString(),
    ...meta,
  };

  const line = JSON.stringify(entry);

  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
  info:  (msg: string, meta?: Record<string, unknown>) => log('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => log('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
};
