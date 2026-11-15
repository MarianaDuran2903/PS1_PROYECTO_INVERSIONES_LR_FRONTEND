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
import { ANFITRION_ROUTES } from './anfitrion.routes';

@Component({ template: 'Sin permisos' })
class SinPermisosStub {}

@Component({ template: 'Login' })
class LoginStub {}

describe('ANFITRION_ROUTES: /anfitrion/publicaciones (Mis publicaciones)', () => {
  const RUTA = '/anfitrion/publicaciones';
  const API = '/api-test';

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
              path: 'anfitrion',
              canActivate: [rolGuard([RolUsuario.Anfitrion])],
              children: ANFITRION_ROUTES,
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

  it('un Huésped que entra va a la página de sin permisos', async () => {
    iniciarSesionCon('HUESPED');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(url()).toBe('/acceso-denegado');
  });

  it('un Administrador tampoco entra: la ruta es solo del Anfitrión', async () => {
    iniciarSesionCon('ADMINISTRADOR');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(url()).toBe('/acceso-denegado');
  });

  it('sin sesión va al login recordando la ruta', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(url()).toContain('/login?returnUrl=');
  });

  it('un Anfitrión entra y la pantalla pide la primera página con 10 por página', async () => {
    iniciarSesionCon('ANFITRION');
    const controller = TestBed.inject(HttpTestingController);

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(url()).toBe(RUTA);
    const peticion = controller.expectOne(
      (req) =>
        req.url === `${API}/publicaciones/mias` &&
        req.params.get('pagina') === '0' &&
        req.params.get('tamano') === '10',
    );
    peticion.flush({
      contenido: [],
      pagina: 0,
      tamano: 10,
      totalElementos: 0,
      totalPaginas: 0,
      mensaje: 'No tiene publicaciones registradas',
    });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('No tiene publicaciones registradas');
    controller.verify();
  });

  it('no choca con las otras rutas de publicaciones', async () => {
    iniciarSesionCon('ANFITRION');
    const controller = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl(`${RUTA}/nueva`);

    expect(url()).toBe(`${RUTA}/nueva`);
    controller.expectOne(`${API}/ciudades`).flush([]);
    controller.expectOne(`${API}/tipos-alojamiento`).flush([]);
    controller.verify();
  });
});
