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

/** La publicación no existe (404). */
export class PublicacionNoEncontradaError extends Error {
  constructor(message = 'La publicación no existe') {
    super(message);
    this.name = 'PublicacionNoEncontradaError';
  }
}

/** La publicación es de otro Anfitrión (403): no se puede ver ni editar. */
export class PublicacionAjenaError extends Error {
  constructor(message = 'No puedes editar esta publicación') {
    super(message);
    this.name = 'PublicacionAjenaError';
  }
}

/** El estado actual no permite editar (409). El mensaje lo define el backend. */
export class PublicacionNoEditableError extends Error {
  constructor(message = 'La publicación no se puede editar en su estado actual') {
    super(message);
    this.name = 'PublicacionNoEditableError';
  }
}
