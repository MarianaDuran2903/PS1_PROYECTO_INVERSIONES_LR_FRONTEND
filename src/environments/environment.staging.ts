import { AppEnvironment } from './app-environment';

/**
 * Entorno de PRUEBAS / QA (`npm run build:staging`, `npm run start:staging`).
 * Mismo comportamiento que producción, con logs más detallados y source maps.
 */
export const environment: AppEnvironment = {
  name: 'staging',
  production: true,
  appName: 'Inversiones LR (QA)',
  apiUrl: '/api/v1',
  useMockApi: false,
  logLevel: 'info',
  tracking: {
    enabled: true,
    remote: true,
  },
};
