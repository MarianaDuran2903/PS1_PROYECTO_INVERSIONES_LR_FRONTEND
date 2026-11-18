import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { OMITIR_AVISO_403 } from '@core/http/http-contexts';
import { ToastService } from '@core/notifications/toast.service';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../session.service';

/** Endpoints públicos: no llevan token y su 401/403 no significa "sesión vencida". */
const RUTAS_PUBLICAS = ['/auth/login', '/auth/registro', '/auth/recuperacion'];

/**
 * - Agrega el token a peticiones privadas de nuestro API.
 * - No añade token a autenticación pública ni a los GET públicos
 *   explícitos de alojamientos y catálogos.
 * - Un 401 privado con sesión abierta cierra la sesión.
 * - Un 403 privado muestra el aviso de permisos, salvo OMITIR_AVISO_403.
 * Debe ir antes de httpErrorInterceptor.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const toast = inject(ToastService);
  const apiUrl = inject(APP_CONFIG).apiUrl;

  const esApi = req.url.startsWith(apiUrl);
  const rutaSinConsulta = req.url.split('?')[0];
  const rutaRelativa = rutaSinConsulta.startsWith(apiUrl)
    ? rutaSinConsulta.slice(apiUrl.length)
    : null;

  const esConsultaPublica =
    req.method === 'GET' &&
    rutaRelativa !== null &&
    ([
      '/alojamientos',
      '/alojamientos/ciudades',
      '/catalogos/tipos-alojamiento',
      '/catalogos/servicios',
    ].includes(rutaRelativa) ||
      /^\/alojamientos\/[1-9]\d*$/.test(rutaRelativa));

  const esPublica =
    esConsultaPublica || RUTAS_PUBLICAS.some((ruta) => req.url.startsWith(`${apiUrl}${ruta}`));
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
        } else if (error.status === 403 && !req.context.get(OMITIR_AVISO_403)) {
          toast.error('Sin permisos', error.message);
        }
      }
      return throwError(() => error);
    }),
  );
};
