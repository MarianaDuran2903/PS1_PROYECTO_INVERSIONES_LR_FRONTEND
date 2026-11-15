import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RolUsuario } from '../../domain/models/rol-usuario';
import { SessionService } from '../session.service';

/**
 * Inicio y búsqueda pública: disponibles para Visitantes y Huéspedes.
 * Los roles de gestión continúan en sus propias pantallas.
 */
export const exploracionGuard: CanActivateFn = () => {
  const session = inject(SessionService);
  const router = inject(Router);

  if (!session.autenticado()) {
    return true;
  }

  if (session.tieneAlgunRol([RolUsuario.Administrador])) {
    return router.createUrlTree(['/admin']);
  }

  if (session.tieneAlgunRol([RolUsuario.Anfitrion])) {
    return router.createUrlTree(['/anfitrion', 'publicaciones']);
  }

  if (session.tieneAlgunRol([RolUsuario.Huesped])) {
    return true;
  }

  return router.createUrlTree(['/acceso-denegado']);
};
