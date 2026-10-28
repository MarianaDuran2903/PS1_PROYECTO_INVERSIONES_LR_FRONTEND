import { InjectionToken } from '@angular/core';
import { AppEnvironment } from '@env/app-environment';

/**
 * Configuración de la aplicación inyectable. Los servicios dependen de este token
 * y no del archivo `environment` directamente, así se pueden sustituir en pruebas.
 */
export const APP_CONFIG = new InjectionToken<AppEnvironment>('APP_CONFIG');
