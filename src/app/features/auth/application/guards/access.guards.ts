import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RolUsuario } from '../../domain/models/rol-usuario';
import { rutaInicialPorRol } from '../rutas';
import { SessionService } from '../session.service';

/** Exige sesión activa. Sin sesión → login, recordando a dónde quería ir (`returnUrl`). */
export const autenticadoGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  return session.autenticado()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/**
 * Exige sesión y al menos uno de los roles indicados, p. ej. `rolGuard([RolUsuario.Anfitrion])`.
 * - Sin sesión → login.
 * - Con sesión pero sin el rol → página "Sin permisos". El backend igual responde 403.
 */
export function rolGuard(roles: readonly RolUsuario[]): CanActivateFn {
  return (route, state) => {
    const session = inject(SessionService);
    const router = inject(Router);

    if (!session.autenticado()) {
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    }
    return session.tieneAlgunRol(roles) ? true : router.createUrlTree(['/acceso-denegado']);
  };
}

/** Para login y registro: quien ya tiene sesión no necesita verlos. */
export const invitadoGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  const usuario = session.usuario();
  return usuario ? router.createUrlTree([rutaInicialPorRol(usuario.roles)]) : true;
};
