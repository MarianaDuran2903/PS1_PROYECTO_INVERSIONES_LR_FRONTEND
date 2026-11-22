import { RolRegistrable, RolUsuario } from './rol-usuario';

/**
 * Datos que el visitante diligencia para crear su cuenta (Huésped o Anfitrión).
 * `rol` decide a qué endpoint se llama; nunca viaja en el cuerpo.
 */
export interface RegistroUsuario {
  rol: RolRegistrable;
  primerNombre: string;
  segundoNombre?: string;
  primerApellido: string;
  segundoApellido?: string;
  correo: string;
  contrasena: string;
  confirmarContrasena: string;
}

export type CampoRegistroUsuario = keyof RegistroUsuario;

/** Errores de validación por campo devueltos al intentar registrar. */
export type ErroresRegistro = Partial<Record<CampoRegistroUsuario, string>>;

/** Usuario creado tras un registro exitoso. */
export interface UsuarioRegistrado {
  idUsuario: number;
  primerNombre: string;
  primerApellido: string;
  correo: string;
  roles: RolUsuario[];
}
