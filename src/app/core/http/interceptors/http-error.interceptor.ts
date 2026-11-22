import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { toApiError } from '@core/http/api-error';
import { LoggerService } from '@core/logging/logger.service';
import { catchError, throwError } from 'rxjs';

/** Convierte cualquier HttpErrorResponse en un ApiError y lo registra. */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const logger = inject(LoggerService);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      const apiError = toApiError(error);
      logger.warn(`HTTP ${req.method} ${req.urlWithParams} -> ${apiError.status} ${apiError.code}`);
      return throwError(() => apiError);
    }),
  );
};
