import { RolUsuario } from './rol-usuario';

/** Datos que la persona escribe para iniciar sesión. */
export interface Credenciales {
  correo: string;
  contrasena: string;
}

/** Usuario autenticado; sus roles determinan a qué rutas puede entrar. */
export interface UsuarioSesion {
  idUsuario: number;
  primerNombre: string;
  primerApellido: string;
  correo: string;
  roles: RolUsuario[];
}

export interface Sesion {
  accessToken: string;
  /** Instante de vencimiento del token, en milisegundos desde epoch. */
  expiraEn: number;
  usuario: UsuarioSesion;
}

/** Respuesta de `GET /auth/sesion`: quién es el usuario y hasta cuándo vale el token. */
export interface SesionActiva {
  usuario: UsuarioSesion;
  expiraEn: number;
}
