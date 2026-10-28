import { ErroresRegistro } from '../models/registro-usuario';

/** El correo ya pertenece a otra cuenta (409). El mensaje lo define el backend. */
export class CorreoYaRegistradoError extends Error {
  constructor(
    readonly correo: string,
    mensaje = 'El correo ya está registrado',
  ) {
    super(mensaje);
    this.name = 'CorreoYaRegistradoError';
  }
}

/** El servidor rechazó uno o más campos del formulario (400 con `errores`). */
export class RegistroInvalidoError extends Error {
  constructor(
    readonly errores: ErroresRegistro,
    message = 'Revisa los campos marcados e inténtalo de nuevo.',
  ) {
    super(message);
    this.name = 'RegistroInvalidoError';
  }
}
