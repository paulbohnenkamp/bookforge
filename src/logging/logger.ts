import type { LogLevel } from '../config/config.js';

const priorities: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

export class ConsoleLogger implements Logger {
  public constructor(private readonly minimumLevel: LogLevel = 'info') {}

  public debug(message: string): void {
    this.write('debug', message);
  }
  public info(message: string): void {
    this.write('info', message);
  }
  public warn(message: string): void {
    this.write('warn', message);
  }
  public error(message: string): void {
    this.write('error', message);
  }

  private write(level: LogLevel, message: string): void {
    if (priorities[level] < priorities[this.minimumLevel]) return;
    const output = `[${level.toUpperCase()}] ${message}`;
    if (level === 'error' || level === 'warn') console.error(output);
    else console.log(output);
  }
}
