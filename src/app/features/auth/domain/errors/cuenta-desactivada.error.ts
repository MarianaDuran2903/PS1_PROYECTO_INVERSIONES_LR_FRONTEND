/** La cuenta existe y las credenciales son válidas, pero está desactivada. */
export class CuentaDesactivadaError extends Error {
  constructor(message = 'Tu cuenta está desactivada. Puedes reactivarla para volver a acceder.') {
    super(message);
    this.name = 'CuentaDesactivadaError';
  }
}
