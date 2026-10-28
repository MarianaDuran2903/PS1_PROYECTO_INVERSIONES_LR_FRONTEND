import { HttpInterceptorFn } from '@angular/common/http';
import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { CORRELATION_ID_HEADER } from '@core/http/api-error';

/**
 * Agrega un identificador único a cada petición para que frontend y backend
 * puedan correlacionar logs y eventos de auditoría (trazabilidad).
 *
 * Solo se envía a peticiones del mismo origen (p. ej. detrás del proxy de nginx): el CORS del
 * backend únicamente admite los encabezados Authorization, Content-Type e Idempotency-Key, y
 * cualquier otro hace que el navegador bloquee la petición entre orígenes distintos.
 */
export const correlationIdInterceptor: HttpInterceptorFn = (req, next) => {
  const origen = inject(DOCUMENT).location.origin;
  if (req.headers.has(CORRELATION_ID_HEADER) || !esMismoOrigen(req.url, origen)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { [CORRELATION_ID_HEADER]: crypto.randomUUID() } }));
};

function esMismoOrigen(url: string, origen: string): boolean {
  try {
    return new URL(url, origen).origin === origen;
  } catch {
    return false;
  }
}
