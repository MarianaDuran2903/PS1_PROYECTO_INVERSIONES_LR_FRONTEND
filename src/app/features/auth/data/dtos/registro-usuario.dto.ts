/** Cuerpo de POST {apiUrl}/auth/registro/huesped y /auth/registro/anfitrion (sin rol). */
export interface RegistroUsuarioRequestDto {
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  correo: string;
  contrasena: string;
  confirmarContrasena: string;
}

export type RolDto = 'HUESPED' | 'ANFITRION' | 'ADMINISTRADOR';

/** Respuesta 201 del registro; también viaja dentro del login y de la sesión activa. */
export interface UsuarioResponseDto {
  idUsuario: number;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  correo: string;
  rol: RolDto;
  cuentaActiva: boolean;
}
