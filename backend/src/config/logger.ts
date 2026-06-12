export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelRank: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const activeLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? 'info';

function enabled(level: LogLevel) {
  return levelRank[level] >= levelRank[activeLevel];
}

export const logger = {
  debug: (...args: unknown[]) => enabled('debug') && console.debug(...args),
  info: (...args: unknown[]) => enabled('info') && console.info(...args),
  warn: (...args: unknown[]) => enabled('warn') && console.warn(...args),
  error: (...args: unknown[]) => enabled('error') && console.error(...args),
};

