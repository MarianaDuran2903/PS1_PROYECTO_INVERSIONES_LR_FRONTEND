import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { environment } from '@env/environment';
import { SESSION_STORAGE_KEY, SessionService } from '@features/auth/application/session.service';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { AuthRepository } from '@features/auth/domain/repositories/auth.repository';
import { routes } from './app.routes';

/** HU-014: el listado público de alojamientos y el Marketplace que lo reutiliza. */
describe('routes: /alojamientos (pública) y /marketplace (Huésped)', () => {
  const API = '/api-test';
  const LISTADO = `${API}/alojamientos`;
  const PAGINA = {
    contenido: [
      {
        idPublicacion: 3,
        titulo: 'Cabaña en la montaña',
        estado: 'ACTIVA',
        ciudad: { id: 2, nombre: 'Medellín' },
        tipo: { id: 4, nombre: 'Cabaña' },
        capacidad: 6,
        precioNoche: 320000,
      },
    ],
    pagina: 0,
    tamano: 10,
    totalElementos: 1,
    totalPaginas: 1,
    mensaje: null,
  };

  let session: SessionService;
  let controller: HttpTestingController;

  const iniciarSesionCon = (...roles: RolUsuario[]) =>
    session.iniciar({
      accessToken: 'tok',
      expiraEn: Date.now() + 3_600_000,
      usuario: {
        idUsuario: 1,
        primerNombre: 'Ana',
        primerApellido: 'Ruiz',
        correo: 'a@b.co',
        roles,
      },
    });
  const url = () => TestBed.inject(Router).url;
  const listado = (harness: RouterTestingHarness) => {
    const peticion = controller.expectOne((r) => r.url === LISTADO);
    peticion.flush(PAGINA);
    harness.detectChanges();
    return peticion.request;
  };

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...environment, apiUrl: API, logLevel: 'error' } },
        {
          // El login (adonde va quien no tiene sesión) necesita el repositorio de autenticación.
          provide: AuthRepository,
          useValue: jasmine.createSpyObj<AuthRepository>('AuthRepository', ['iniciarSesion']),
        },
      ],
    });
    session = TestBed.inject(SessionService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  describe('/alojamientos', () => {
    it('un Visitante sin sesión entra y ve el listado, sin pasar por el login', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/alojamientos');
      const peticion = listado(harness);

      expect(url()).toBe('/alojamientos');
      expect(harness.routeNativeElement!.tagName.toLowerCase()).toBe('app-alojamientos-page');
      expect(harness.routeNativeElement!.textContent).toContain('Cabaña en la montaña');
      expect(peticion.method).toBe('GET');
      expect(peticion.headers.has('Authorization')).toBeFalse();
    });

    it('un Huésped también lo ve, y su petición tampoco lleva token', async () => {
      iniciarSesionCon('HUESPED');

      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/alojamientos');
      const peticion = listado(harness);

      expect(url()).toBe('/alojamientos');
      expect(peticion.headers.has('Authorization')).toBeFalse();
    });

    it('un Anfitrión con sesión también puede verlo: es público', async () => {
      iniciarSesionCon('ANFITRION');

      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/alojamientos');
      listado(harness);

      expect(url()).toBe('/alojamientos');
    });
  });

  describe('/marketplace', () => {
    it('un Huésped ve el mismo listado, con la misma página y el mismo repositorio', async () => {
      iniciarSesionCon('HUESPED');

      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/marketplace');
      listado(harness);

      expect(url()).toBe('/marketplace');
      expect(harness.routeNativeElement!.tagName.toLowerCase()).toBe('app-alojamientos-page');
      expect(harness.routeNativeElement!.textContent).toContain('Cabaña en la montaña');
    });

    it('un Anfitrión sigue sin entrar al Marketplace y no se hace ninguna petición', async () => {
      iniciarSesionCon('ANFITRION');

      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/marketplace');

      expect(url()).toBe('/acceso-denegado');
      controller.expectNone((r) => r.url === LISTADO);
    });

    it('sin sesión va al login recordando la ruta', async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/marketplace');

      expect(url()).toContain('/login?returnUrl=');
      controller.expectNone((r) => r.url === LISTADO);
    });
  });
});
