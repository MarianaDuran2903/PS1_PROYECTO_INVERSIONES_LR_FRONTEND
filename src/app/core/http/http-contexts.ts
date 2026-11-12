import { HttpContextToken } from '@angular/common/http';

/**
 * Marca una petición cuyo 403 lo explica la propia pantalla (p. ej. "No puedes editar esta
 * publicación"). El interceptor de sesión no muestra entonces su aviso global de "Sin permisos",
 * para que no salgan dos mensajes.
 */
export const OMITIR_AVISO_403 = new HttpContextToken<boolean>(() => false);
