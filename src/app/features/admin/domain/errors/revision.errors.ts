/**
 * El servidor rechazó el motivo del rechazo (400 con `errores.motivo`): es obligatorio y debe
 * tener entre 10 y 500 caracteres. El mensaje es el del backend, listo para mostrarlo.
 */
export class MotivoInvalidoError extends Error {
  constructor(message = 'El motivo es obligatorio y debe tener entre 10 y 500 caracteres') {
    super(message);
    this.name = 'MotivoInvalidoError';
  }
}
