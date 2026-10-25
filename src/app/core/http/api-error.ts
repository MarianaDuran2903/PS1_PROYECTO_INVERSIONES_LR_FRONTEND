import { HttpErrorResponse } from '@angular/common/http';

export const CORRELATION_ID_HEADER = 'X-Correlation-Id';

export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * Error normalizado del API. Toda respuesta HTTP fallida se convierte a este tipo
 * en `httpErrorInterceptor`, de modo que el resto de la app no depende de HttpErrorResponse.
 *
 * Cuerpo de error esperado del backend:
 * `{ "code": "EMAIL_ALREADY_REGISTERED", "message": "...", "errors": [{ "field": "email", "message": "..." }] }`
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: ApiFieldError[] = [],
    readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiErrorBody {
  code?: unknown;
  message?: unknown;
  errors?: unknown;
}

export function toApiError(error: HttpErrorResponse): ApiError {
  const correlationId = error.headers?.get(CORRELATION_ID_HEADER) ?? undefined;

  if (error.status === 0) {
    return new ApiError(
      0,
      'NETWORK_ERROR',
      'No fue posible conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.',
      [],
      correlationId,
    );
  }

  const body: ApiErrorBody =
    typeof error.error === 'object' && error.error !== null ? (error.error as ApiErrorBody) : {};

  return new ApiError(
    error.status,
    typeof body.code === 'string' ? body.code : `HTTP_${error.status}`,
    typeof body.message === 'string'
      ? body.message
      : 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.',
    Array.isArray(body.errors) ? body.errors.filter(isApiFieldError) : [],
    correlationId,
  );
}

function isApiFieldError(value: unknown): value is ApiFieldError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiFieldError).field === 'string' &&
    typeof (value as ApiFieldError).message === 'string'
  );
}
