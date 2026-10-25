import { RolUsuario } from '../domain/models/rol-usuario';

/** Primera pantalla tras iniciar sesión; si la persona tiene varios roles gana el de mayor alcance. */
const RUTA_POR_ROL: readonly (readonly [RolUsuario, string])[] = [
  [RolUsuario.Administrador, '/admin'],
  [RolUsuario.Anfitrion, '/anfitrion'],
  [RolUsuario.Huesped, '/marketplace'],
];

export function rutaInicialPorRol(roles: readonly RolUsuario[]): string {
  return RUTA_POR_ROL.find(([rol]) => roles.includes(rol))?.[1] ?? '/';
}

/**
 * Valida un `returnUrl` recibido por query param. Solo se aceptan rutas internas, para que
 * nadie pueda armar un enlace de login que redirija a otro sitio (open redirect).
 */
export function urlInternaSegura(url: string | null | undefined): string | null {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.includes('\\')) {
    return null;
  }
  return url;
}
