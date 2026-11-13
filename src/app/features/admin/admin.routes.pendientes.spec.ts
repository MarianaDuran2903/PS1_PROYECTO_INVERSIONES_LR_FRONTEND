import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { environment } from '@env/environment';
import { rolGuard } from '@features/auth/application/guards/access.guards';
import { SESSION_STORAGE_KEY, SessionService } from '@features/auth/application/session.service';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { ADMIN_ROUTES } from './admin.routes';

@Component({ template: 'Sin permisos' })
class SinPermisosStub {}

@Component({ template: 'Login' })
class LoginStub {}

/** HU-013: la bandeja de pendientes solo es para el Administrador. */
describe('ADMIN_ROUTES: /admin/publicaciones/pendientes (bandeja de revisión)', () => {
  const RUTA = '/admin/publicaciones/pendientes';
  const API = '/api-test';
  const PENDIENTES = `${API}/admin/publicaciones/pendientes`;
  const PAGINA_VACIA = {
    contenido: [],
    pagina: 0,
    tamano: 10,
    totalElementos: 0,
    totalPaginas: 0,
    mensaje: 'No hay publicaciones pendientes de revisión',
  };

  let session: SessionService;

  const iniciarSesionCon = (...roles: RolUsuario[]) =>
    session.iniciar({
      accessToken: 't',
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

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            {
              path: 'admin',
              canActivate: [rolGuard([RolUsuario.Administrador])],
              children: ADMIN_ROUTES,
            },
            { path: 'acceso-denegado', component: SinPermisosStub },
            { path: 'login', component: LoginStub },
          ],
          withComponentInputBinding(),
        ),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...environment, apiUrl: API, logLevel: 'error' } },
      ],
    });
    session = TestBed.inject(SessionService);
  });

  afterEach(() => {
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  for (const rol of ['ANFITRION', 'HUESPED'] as const) {
    it(`un ${rol} (sin rol Administrador) es denegado y no se hace ninguna petición`, async () => {
      iniciarSesionCon(rol);
      const controller = TestBed.inject(HttpTestingController);

      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(RUTA);

      expect(url()).toBe('/acceso-denegado');
      controller.expectNone((r) => r.url === PENDIENTES);
      controller.verify();
    });
  }

  it('sin sesión va al login recordando la ruta', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(url()).toContain('/login?returnUrl=');
  });

  it('un Administrador entra y la bandeja pide las pendientes a la ruta de administrador', async () => {
    iniciarSesionCon('ADMINISTRADOR');
    const controller = TestBed.inject(HttpTestingController);

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);
    const req = controller.expectOne((r) => r.url === PENDIENTES);
    expect(req.request.method).toBe('GET');
    req.flush(PAGINA_VACIA);
    harness.detectChanges();

    expect(url()).toBe(RUTA);
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain(
      'Publicaciones pendientes de revisión',
    );
    expect(harness.routeNativeElement!.textContent).toContain(
      'No hay publicaciones pendientes de revisión',
    );
    controller.verify();
  });

  it('la ruta de pendientes no se confunde con la de intervenir una publicación', async () => {
    iniciarSesionCon('ADMINISTRADOR');
    const controller = TestBed.inject(HttpTestingController);

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    // El elemento de la ruta es el propio componente: debe ser la bandeja y no la intervención.
    expect(harness.routeNativeElement!.tagName.toLowerCase()).toBe('app-bandeja-pendientes-page');
    controller.expectOne((r) => r.url === PENDIENTES).flush(PAGINA_VACIA);
    controller.verify();
  });
});
