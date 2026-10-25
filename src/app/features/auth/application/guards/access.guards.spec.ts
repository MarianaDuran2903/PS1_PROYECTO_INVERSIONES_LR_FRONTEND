import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { RolUsuario } from '../../domain/models/rol-usuario';
import { Sesion } from '../../domain/models/sesion';
import { SESSION_STORAGE_KEY, SessionService } from '../session.service';
import { guestGuard, roleGuard } from './access.guards';

describe('access guards', () => {
  const sesionCon = (...roles: RolUsuario[]): Sesion => ({
    accessToken: 't',
    usuario: { idUsuario: 1, primerNombre: 'Ana', primerApellido: 'Ruiz', correo: 'a@b.co', roles },
  });

  let session: SessionService;
  let router: Router;

  const ejecutar = (guard: CanActivateFn, roles?: RolUsuario[], url = '/marketplace') => {
    const ruta = { data: roles ? { roles } : {} } as unknown as ActivatedRouteSnapshot;
    const resultado = TestBed.runInInjectionContext(() =>
      guard(ruta, { url } as RouterStateSnapshot),
    );
    return resultado instanceof UrlTree ? router.serializeUrl(resultado) : resultado;
  };

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });
  afterEach(() => sessionStorage.removeItem(SESSION_STORAGE_KEY));

  describe('roleGuard', () => {
    it('sin sesión redirige al login recordando a dónde quería ir', () => {
      expect(ejecutar(roleGuard, ['HUESPED'], '/marketplace')).toBe(
        '/auth/login?returnUrl=%2Fmarketplace',
      );
    });

    it('con sesión pero sin el rol redirige a acceso denegado', () => {
      session.iniciar(sesionCon('HUESPED'));

      expect(ejecutar(roleGuard, ['ANFITRION'], '/anfitrion')).toBe('/acceso-denegado');
      expect(ejecutar(roleGuard, ['ADMINISTRADOR'], '/admin')).toBe('/acceso-denegado');
    });

    it('con el rol requerido deja pasar', () => {
      session.iniciar(sesionCon('ANFITRION'));

      expect(ejecutar(roleGuard, ['ANFITRION'])).toBeTrue();
    });

    it('basta con uno de los roles cuando la persona tiene varios', () => {
      session.iniciar(sesionCon('HUESPED', 'ANFITRION'));

      expect(ejecutar(roleGuard, ['ADMINISTRADOR', 'ANFITRION'])).toBeTrue();
    });

    it('sin roles declarados en la ruta solo exige sesión', () => {
      expect(ejecutar(roleGuard)).toBe('/auth/login?returnUrl=%2Fmarketplace');

      session.iniciar(sesionCon('HUESPED'));
      expect(ejecutar(roleGuard)).toBeTrue();
    });
  });

  describe('guestGuard', () => {
    it('deja ver login y registro a quien no tiene sesión', () => {
      expect(ejecutar(guestGuard)).toBeTrue();
    });

    it('manda a su pantalla a quien ya tiene sesión', () => {
      session.iniciar(sesionCon('ANFITRION'));

      expect(ejecutar(guestGuard)).toBe('/anfitrion');
    });
  });
});
