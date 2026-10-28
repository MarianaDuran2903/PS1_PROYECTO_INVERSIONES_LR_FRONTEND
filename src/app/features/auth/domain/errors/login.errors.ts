/** Correo o contraseña incorrectos. Nunca indica cuál de los dos falló ni el estado de la cuenta. */
export class CredencialesInvalidasError extends Error {
  constructor(mensaje = 'Correo o contraseña incorrectos') {
    super(mensaje);
    this.name = 'CredencialesInvalidasError';
  }
}
