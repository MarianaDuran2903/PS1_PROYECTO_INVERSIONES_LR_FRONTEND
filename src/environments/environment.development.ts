import { AppEnvironment } from './app-environment';

/**
 * Entorno de DESARROLLO local (`npm start` o el contenedor en el puerto 4200).
 * El navegador llama directo al backend en http://localhost:8080; el backend solo acepta
 * CORS desde http://localhost:4200, así que el frontend debe abrirse en ese puerto exacto.
 */
export const environment: AppEnvironment = {
  name: 'development',
  production: false,
  appName: 'Inversiones LR (DEV)',
  apiUrl: 'http://localhost:8080/api/v1',
  logLevel: 'debug',
  tracking: {
    enabled: true,
    remote: false,
  },
};
