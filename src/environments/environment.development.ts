import { AppEnvironment } from './app-environment';

/**
 * Entorno de DESARROLLO local (`npm start`).
 * Las peticiones a `/api` las redirige el dev-server al backend según `proxy.conf.js`
 * (por defecto http://localhost:8080), lo que evita problemas de CORS.
 *
 * Mientras el backend no exponga el endpoint de registro, `useMockApi: true`
 * permite trabajar con un repositorio en memoria. Cámbialo a `false` para usar el API real.
 */
export const environment: AppEnvironment = {
  name: 'development',
  production: false,
  appName: 'Inversiones LR (DEV)',
  apiUrl: '/api/v1',
  useMockApi: true,
  logLevel: 'debug',
  tracking: {
    enabled: true,
    remote: false,
  },
};
