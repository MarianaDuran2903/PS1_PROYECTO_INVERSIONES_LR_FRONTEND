import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { LogLevel } from '@env/app-environment';

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** Punto único de logging; el nivel mínimo depende del entorno. */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly minWeight = LEVEL_WEIGHT[inject(APP_CONFIG).logLevel];

  debug(message: string, ...data: unknown[]): void {
    this.write('debug', message, data);
  }

  info(message: string, ...data: unknown[]): void {
    this.write('info', message, data);
  }

  warn(message: string, ...data: unknown[]): void {
    this.write('warn', message, data);
  }

  error(message: string, ...data: unknown[]): void {
    this.write('error', message, data);
  }

  private write(level: LogLevel, message: string, data: unknown[]): void {
    if (LEVEL_WEIGHT[level] < this.minWeight) {
      return;
    }
    console[level](`[${level.toUpperCase()}] ${message}`, ...data);
  }
}
