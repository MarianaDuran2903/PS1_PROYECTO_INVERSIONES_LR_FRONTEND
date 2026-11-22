/** Datos para fijar la nueva contraseña con el código (token) de la recuperación. */
export interface RestablecerContrasena {
  token: string;
  contrasena: string;
  confirmarContrasena: string;
}

export type CampoRestablecimiento = 'token' | 'contrasena' | 'confirmarContrasena';

/** Errores por campo que devuelve el backend al restablecer la contraseña. */
export type ErroresRestablecimiento = Partial<Record<CampoRestablecimiento, string>>;

/** Errores por campo que devuelve el backend al solicitar la recuperación. */
export type ErroresSolicitudRecuperacion = Partial<Record<'correo', string>>;
