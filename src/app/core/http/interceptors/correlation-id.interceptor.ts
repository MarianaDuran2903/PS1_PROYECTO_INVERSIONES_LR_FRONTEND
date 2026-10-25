import { HttpInterceptorFn } from '@angular/common/http';
import { CORRELATION_ID_HEADER } from '@core/http/api-error';

/**
 * Agrega un identificador único a cada petición para que frontend y backend
 * puedan correlacionar logs y eventos de auditoría (trazabilidad).
 */
export const correlationIdInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.headers.has(CORRELATION_ID_HEADER)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { [CORRELATION_ID_HEADER]: crypto.randomUUID() } }));
};
