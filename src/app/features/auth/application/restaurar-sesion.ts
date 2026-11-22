import { inject } from '@angular/core';
import { ApiError } from '@core/http/api-error';
import { firstValueFrom } from 'rxjs';
import { AuthRepository } from '../domain/repositories/auth.repository';
import { SessionService } from './session.service';

/**
 * Se ejecuta al iniciar la app (`provideAppInitializer`). Si quedó un token guardado, le pregunta
 * al backend por el usuario y el rol vigentes (`GET /auth/sesion`):
 * - 200: actualiza la sesión con lo que dice el servidor.
 * - 401: el token ya no vale; se limpia la sesión.
 * - Cualquier otro fallo (p. ej. sin red) no bloquea el arranque ni cierra la sesión.
 */
export function restaurarSesion(): Promise<void> {
  const session = inject(SessionService);
  const repository = inject(AuthRepository);

  if (!session.token()) {
    return Promise.resolve();
  }
  return firstValueFrom(repository.obtenerSesion())
    .then((activa) => session.actualizar(activa))
    .catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 401) {
        session.cerrar();
      }
    });
}
