import { UsuarioResponseDto } from './registro-usuario.dto';

/** Cuerpo de POST {apiUrl}/auth/login. */
export interface LoginRequestDto {
  correo: string;
  contrasena: string;
}

/** Respuesta 200 del login. */
export interface LoginResponseDto {
  accessToken: string;
  usuario: UsuarioResponseDto;
}
