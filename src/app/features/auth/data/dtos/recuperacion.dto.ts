/** POST /auth/recuperacion/solicitud */
export interface SolicitudRecuperacionRequestDto {
  correo: string;
}

/** POST /auth/recuperacion/restablecer */
export interface RestablecerContrasenaRequestDto {
  token: string;
  contrasena: string;
  confirmarContrasena: string;
}

/** 202 de la solicitud y 200 del restablecimiento. */
export interface MensajeResponseDto {
  mensaje: string;
}
