import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { correlationIdInterceptor } from '@core/http/interceptors/correlation-id.interceptor';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { environment } from '@env/environment';
import { authTokenInterceptor } from '@features/auth/application/interceptors/auth-token.interceptor';
import { restaurarSesion } from '@features/auth/application/restaurar-sesion';
import { AuthHttpRepository } from '@features/auth/data/repositories/auth-http.repository';
import { AuthRepository } from '@features/auth/domain/repositories/auth.repository';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    // Cadena de interceptores (Chain of Responsibility): el primero es el más externo, así que
    // authToken ve el ApiError que httpError (el más interno) ya normalizó.
    provideHttpClient(
      withFetch(),
      withInterceptors([correlationIdInterceptor, authTokenInterceptor, httpErrorInterceptor]),
    ),
    { provide: APP_CONFIG, useValue: environment },
    { provide: AuthRepository, useClass: AuthHttpRepository },
    // Al arrancar, recupera el usuario y el rol de una sesión guardada (GET /auth/sesion).
    provideAppInitializer(restaurarSesion),
  ],
};
