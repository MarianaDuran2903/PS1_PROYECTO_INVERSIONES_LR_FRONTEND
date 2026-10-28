import { AppEnvironment } from './app-environment';

/**
 * Entorno de PRODUCCIÓN (configuración por defecto de `ng build`).
 * Se asume que el frontend y el API se publican bajo el mismo dominio
 * detrás de un proxy inverso, por eso la URL del API es relativa.
 */
export const environment: AppEnvironment = {
  name: 'production',
  production: true,
  appName: 'Inversiones LR',
  apiUrl: '/api/v1',
  logLevel: 'warn',
  tracking: {
    enabled: true,
    remote: true,
  },
};
