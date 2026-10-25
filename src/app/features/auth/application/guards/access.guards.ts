import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RolUsuario } from '../../domain/models/rol-usuario';
import { rutaInicialPorRol } from '../rutas';
import { SessionService } from '../session.service';

/**
 * Exige sesión activa y, si la ruta declara `data: { roles: [...] }`, al menos uno de esos roles.
 * - Sin sesión → login, recordando a dónde quería ir (`returnUrl`).
 * - Con sesión pero sin rol → página de acceso denegado.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.autenticado()) {
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }

  const roles = (route.data['roles'] ?? []) as readonly RolUsuario[];
  return session.tieneAlgunRol(roles) ? true : router.createUrlTree(['/acceso-denegado']);
};

/** Para login y registro: quien ya tiene sesión no necesita verlos. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  const usuario = session.usuario();
  return usuario ? router.createUrlTree([rutaInicialPorRol(usuario.roles)]) : true;
};
