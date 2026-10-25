export type EnvironmentName = 'development' | 'staging' | 'production';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Contrato que deben cumplir todos los archivos `environment*.ts`.
 * Solo valores públicos: todo lo que va aquí termina dentro del bundle del navegador,
 * así que nunca se deben poner secretos (claves, tokens, contraseñas).
 */
export interface AppEnvironment {
  name: EnvironmentName;
  production: boolean;
  appName: string;
  /** URL base del API REST del backend (sin "/" final). */
  apiUrl: string;
  /** Usa repositorios en memoria en lugar del backend real. */
  useMockApi: boolean;
  logLevel: LogLevel;
  tracking: {
    enabled: boolean;
    /** Si es true, los eventos de trazabilidad se envían a `${apiUrl}/events`. */
    remote: boolean;
  };
}
