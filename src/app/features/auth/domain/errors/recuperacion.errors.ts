import { ErroresRestablecimiento, ErroresSolicitudRecuperacion } from '../models/recuperacion';

/** El servidor rechazó el correo de la solicitud (400 con `errores.correo`). */
export class SolicitudRecuperacionInvalidaError extends Error {
  constructor(
    readonly errores: ErroresSolicitudRecuperacion,
    message = 'Revisa el correo e inténtalo de nuevo.',
  ) {
    super(message);
    this.name = 'SolicitudRecuperacionInvalidaError';
  }
}

/** El servidor rechazó uno o más campos al restablecer (400 con `errores`). */
export class RestablecimientoInvalidoError extends Error {
  constructor(
    readonly errores: ErroresRestablecimiento,
    message = 'Revisa los campos marcados e inténtalo de nuevo.',
  ) {
    super(message);
    this.name = 'RestablecimientoInvalidoError';
  }
}

/**
 * El enlace de recuperación no sirve: el token no existe, venció o ya se usó (400 sin `errores`).
 * El backend responde con el mismo mensaje en los tres casos, así que no se distingue.
 */
export class EnlaceRecuperacionInvalidoError extends Error {
  constructor(message = 'El enlace de recuperación no es válido o ha expirado') {
    super(message);
    this.name = 'EnlaceRecuperacionInvalidoError';
  }
}
