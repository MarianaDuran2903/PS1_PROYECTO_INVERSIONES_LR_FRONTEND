import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { correlationIdInterceptor } from '@core/http/interceptors/correlation-id.interceptor';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { environment } from '@env/environment';
import { authTokenInterceptor } from '@features/auth/application/interceptors/auth-token.interceptor';
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
  ],
};
