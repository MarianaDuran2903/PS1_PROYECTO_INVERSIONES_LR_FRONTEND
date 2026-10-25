/** Cuerpo de POST {apiUrl}/auth/registro. */
export interface RegistrarUsuarioRequestDto {
  /** HUESPED | ANFITRION. El administrador no se registra por este endpoint. */
  rol: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  correo: string;
  contrasena: string;
}

/** Respuesta 201 Created del registro. */
export interface UsuarioResponseDto {
  idUsuario: number;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  correo: string;
  roles: string[];
}
