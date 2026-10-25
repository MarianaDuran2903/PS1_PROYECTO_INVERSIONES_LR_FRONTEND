import { ErroresRegistro } from '../models/registro-usuario';

/** El correo ya pertenece a otra cuenta (restricción uq_usuario_correo). */
export class CorreoYaRegistradoError extends Error {
  constructor(readonly correo: string) {
    super('Este correo electrónico ya está registrado.');
    this.name = 'CorreoYaRegistradoError';
  }
}

/** El servidor rechazó uno o más campos del formulario. */
export class RegistroInvalidoError extends Error {
  constructor(
    readonly errores: ErroresRegistro,
    message = 'Revisa los campos marcados e inténtalo de nuevo.',
  ) {
    super(message);
    this.name = 'RegistroInvalidoError';
  }
}
