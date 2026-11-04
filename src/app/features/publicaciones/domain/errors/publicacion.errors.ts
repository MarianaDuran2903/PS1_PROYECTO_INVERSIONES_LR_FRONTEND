import { ErroresPublicacion } from '../models/publicacion';

/** El servidor rechazó uno o más campos del formulario (400 con `errores`). */
export class PublicacionInvalidaError extends Error {
  constructor(
    readonly errores: ErroresPublicacion,
    message = 'Revisa los campos marcados e inténtalo de nuevo.',
  ) {
    super(message);
    this.name = 'PublicacionInvalidaError';
  }
}
