import { UsuarioResponseDto } from './registro-usuario.dto';

/** Cuerpo de POST {apiUrl}/auth/login. */
export interface LoginRequestDto {
  correo: string;
  contrasena: string;
}

/** Respuesta 200 del login. `expiraEn` son los segundos de validez (3600 = 60 minutos). */
export interface LoginResponseDto {
  token: string;
  tipo: 'Bearer';
  expiraEn: number;
  usuario: UsuarioResponseDto;
}

/** Respuesta de GET {apiUrl}/auth/sesion. `expiraEn` es una fecha ISO-8601 en UTC. */
export interface SesionResponseDto {
  usuario: UsuarioResponseDto;
  expiraEn: string;
}
