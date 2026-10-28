import { HttpErrorResponse } from '@angular/common/http';

export const CORRELATION_ID_HEADER = 'X-Correlation-Id';

export interface ApiFieldError {
  field: string;
  message: string;
}

/** Cuerpo de error que devuelven TODOS los endpoints del backend. */
export interface ErrorResponse {
  fecha: string;
  estado: number;
  error: string;
  mensaje: string;
  ruta: string;
  /** Solo en 400 de validación: { campo: mensaje }. */
  errores?: Record<string, string>;
}

const MENSAJE_GENERICO = 'Ocurrió un error inesperado. Inténtalo de nuevo más tarde.';

/**
 * Error normalizado del API. Toda respuesta HTTP fallida se convierte a este tipo
 * en `httpErrorInterceptor`, de modo que el resto de la app no depende de HttpErrorResponse.
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

  const body: Partial<ErrorResponse> =
    typeof error.error === 'object' && error.error !== null
      ? (error.error as Partial<ErrorResponse>)
      : {};

  // Nunca se muestran detalles técnicos: en un 500 el mensaje es siempre genérico.
  const mensaje =
    error.status >= 500 || typeof body.mensaje !== 'string' ? MENSAJE_GENERICO : body.mensaje;

  return new ApiError(
    error.status,
    `HTTP_${error.status}`,
    mensaje,
    erroresPorCampo(body.errores),
    correlationId,
  );
}

function erroresPorCampo(errores: unknown): ApiFieldError[] {
  if (typeof errores !== 'object' || errores === null) {
    return [];
  }
  return Object.entries(errores)
    .filter((entrada): entrada is [string, string] => typeof entrada[1] === 'string')
    .map(([field, message]) => ({ field, message }));
}
