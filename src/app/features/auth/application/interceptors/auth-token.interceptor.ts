import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../session.service';

/**
 * - Agrega `Authorization: Bearer <token>` solo a las peticiones a nuestro API (nunca a otros hosts).
 * - Si el backend responde 401 con una sesión abierta, el token venció: cierra la sesión y
 *   lleva a login. El 401 del propio login (credenciales malas) no cuenta.
 * Debe ir antes de `httpErrorInterceptor` para ver el `ApiError` ya normalizado.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const toast = inject(ToastService);

  const esApi = req.url.startsWith(inject(APP_CONFIG).apiUrl);
  const token = session.token();
  const request =
    esApi && token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      const sesionVencida =
        esApi &&
        token !== null &&
        error instanceof ApiError &&
        error.status === 401 &&
        !req.url.endsWith('/auth/login');

      if (sesionVencida) {
        const destino = router.url;
        session.cerrar();
        toast.info('Tu sesión expiró', 'Inicia sesión de nuevo para continuar.');
        void router.navigate(['/auth/login'], { queryParams: { returnUrl: destino } });
      }
      return throwError(() => error);
    }),
  );
};
