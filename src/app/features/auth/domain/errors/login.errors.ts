/** Correo o contraseña incorrectos. Nunca indica cuál de los dos falló. */
export class CredencialesInvalidasError extends Error {
  constructor() {
    super('Correo o contraseña incorrectos.');
    this.name = 'CredencialesInvalidasError';
  }
}

export type MotivoCuentaNoDisponible = 'INACTIVA' | 'RESTRINGIDA';

const MENSAJES: Record<MotivoCuentaNoDisponible, string> = {
  INACTIVA: 'Tu cuenta está desactivada.',
  RESTRINGIDA: 'Tu cuenta fue restringida por un administrador.',
};

/** Credenciales correctas, pero la cuenta no puede iniciar sesión (cuenta_activa / restringido). */
export class CuentaNoDisponibleError extends Error {
  constructor(readonly motivo: MotivoCuentaNoDisponible) {
    super(MENSAJES[motivo]);
    this.name = 'CuentaNoDisponibleError';
  }
}
