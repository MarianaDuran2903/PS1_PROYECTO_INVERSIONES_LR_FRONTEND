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
import { autenticadoGuard, invitadoGuard, rolGuard } from './access.guards';

describe('access guards', () => {
  const sesionCon = (...roles: RolUsuario[]): Sesion => ({
    accessToken: 't',
    expiraEn: Date.now() + 3_600_000,
    usuario: { idUsuario: 1, primerNombre: 'Ana', primerApellido: 'Ruiz', correo: 'a@b.co', roles },
  });

  let session: SessionService;
  let router: Router;

  const ejecutar = (guard: CanActivateFn, url = '/marketplace') => {
    const resultado = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
    return resultado instanceof UrlTree ? router.serializeUrl(resultado) : resultado;
  };

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });
  afterEach(() => {
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  describe('autenticadoGuard', () => {
    it('sin sesión redirige al login recordando a dónde quería ir', () => {
      expect(ejecutar(autenticadoGuard, '/reservas')).toBe('/login?returnUrl=%2Freservas');
    });

    it('con sesión deja pasar, sea cual sea el rol', () => {
      session.iniciar(sesionCon('HUESPED'));

      expect(ejecutar(autenticadoGuard)).toBeTrue();
    });
  });

  describe('rolGuard', () => {
    it('sin sesión redirige al login recordando a dónde quería ir', () => {
      expect(ejecutar(rolGuard(['HUESPED']), '/marketplace')).toBe(
        '/login?returnUrl=%2Fmarketplace',
      );
    });

    it('con sesión pero sin el rol redirige a la página de sin permisos', () => {
      session.iniciar(sesionCon('HUESPED'));

      expect(ejecutar(rolGuard(['ANFITRION']), '/anfitrion')).toBe('/acceso-denegado');
      expect(ejecutar(rolGuard(['ADMINISTRADOR']), '/admin')).toBe('/acceso-denegado');
    });

    it('con el rol requerido deja pasar', () => {
      session.iniciar(sesionCon('ANFITRION'));

      expect(ejecutar(rolGuard(['ANFITRION']))).toBeTrue();
    });

    it('basta con uno de los roles pedidos', () => {
      session.iniciar(sesionCon('ANFITRION'));

      expect(ejecutar(rolGuard(['ADMINISTRADOR', 'ANFITRION']))).toBeTrue();
    });
  });

  describe('invitadoGuard', () => {
    it('deja ver login y registro a quien no tiene sesión', () => {
      expect(ejecutar(invitadoGuard)).toBeTrue();
    });

    it('manda a su pantalla a quien ya tiene sesión', () => {
      session.iniciar(sesionCon('ANFITRION'));

      expect(ejecutar(invitadoGuard)).toBe('/anfitrion');
    });
  });
});
