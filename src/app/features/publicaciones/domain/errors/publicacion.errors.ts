import { ErroresPublicacion, PendientesActivacion } from '../models/publicacion';

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

/**
 * Falta información mínima para solicitar la activación (400 con `errores`). La publicación no
 * cambia. `pendientes` trae el mensaje del backend por cada campo que falta.
 */
export class InformacionMinimaIncompletaError extends Error {
  constructor(
    readonly pendientes: PendientesActivacion,
    message = 'La publicación no está lista para revisión',
  ) {
    super(message);
    this.name = 'InformacionMinimaIncompletaError';
  }
}

/**
 * El estado actual no permite esa acción del ciclo de vida (409): por ejemplo, enviar a revisión
 * una publicación que ya está en revisión, activa, pausada o bloqueada. El mensaje lo define el
 * backend y explica el motivo. Sirve para todas las acciones que cambian el estado.
 */
export class TransicionNoPermitidaError extends Error {
  constructor(message = 'La publicación no permite esta acción en su estado actual') {
    super(message);
    this.name = 'TransicionNoPermitidaError';
  }
}
