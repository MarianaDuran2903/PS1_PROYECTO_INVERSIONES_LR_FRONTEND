import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../session.service';

/** Endpoints públicos: no llevan token y su 401/403 no significa "sesión vencida". */
const RUTAS_PUBLICAS = ['/auth/login', '/auth/registro'];

/**
 * - Agrega `Authorization: Bearer <token>` solo a las peticiones a nuestro API (nunca a otros
 *   hosts), excepto login y registro.
 * - 401 con una sesión abierta: el token venció o no es válido; cierra la sesión y lleva a
 *   `/login?expirada=true`.
 * - 403: muestra el aviso de permisos y NO cierra la sesión.
 * Debe ir antes de `httpErrorInterceptor` para ver el `ApiError` ya normalizado.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const apiUrl = inject(APP_CONFIG).apiUrl;

  const esApi = req.url.startsWith(apiUrl);
  const esPublica = RUTAS_PUBLICAS.some((ruta) => req.url.startsWith(`${apiUrl}${ruta}`));
  const token = session.token();
  const request =
    esApi && !esPublica && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (esApi && !esPublica && error instanceof ApiError) {
        if (error.status === 401 && token !== null) {
          session.cerrar();
          void router.navigate(['/login'], { queryParams: { expirada: 'true' } });
        } else if (error.status === 403) {
          toast.error('Sin permisos', error.message);
        }
      }
      return throwError(() => error);
    }),
  );
};
