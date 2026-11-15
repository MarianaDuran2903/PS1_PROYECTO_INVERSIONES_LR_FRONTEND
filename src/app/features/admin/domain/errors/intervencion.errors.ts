import { ErroresIntervencion } from '@features/publicaciones/domain/models/publicacion';

/**
 * El servidor rechazó el motivo o uno o más campos de la intervención (400 con `errores`).
 * Las claves ya vienen sin el prefijo `cambios.` que usa el backend.
 */
export class IntervencionInvalidaError extends Error {
  constructor(
    readonly errores: ErroresIntervencion,
    message = 'Revisa los campos marcados e inténtalo de nuevo.',
  ) {
    super(message);
    this.name = 'IntervencionInvalidaError';
  }
}
