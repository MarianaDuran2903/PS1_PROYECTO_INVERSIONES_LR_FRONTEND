import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
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

describe('ANFITRION_ROUTES: /anfitrion/publicaciones/nueva', () => {
  const RUTA = '/anfitrion/publicaciones/nueva';
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

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'anfitrion',
            canActivate: [rolGuard([RolUsuario.Anfitrion])],
            children: ANFITRION_ROUTES,
          },
          { path: 'acceso-denegado', component: SinPermisosStub },
          { path: 'login', component: LoginStub },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { ...environment, apiUrl: '/api-test', logLevel: 'error' },
        },
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

    expect(TestBed.inject(Router).url).toBe('/acceso-denegado');
  });

  it('un Administrador tampoco entra: la ruta es solo del Anfitrión', async () => {
    iniciarSesionCon('ADMINISTRADOR');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(TestBed.inject(Router).url).toBe('/acceso-denegado');
  });

  it('sin sesión va al login recordando la ruta', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(TestBed.inject(Router).url).toContain('/login?returnUrl=');
  });

  it('un Anfitrión entra, y la pantalla pide ciudades y tipos', async () => {
    iniciarSesionCon('ANFITRION');
    const controller = TestBed.inject(HttpTestingController);

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(TestBed.inject(Router).url).toBe(RUTA);
    controller.expectOne('/api-test/ciudades').flush([{ id: 1, nombre: 'Bogotá' }]);
    controller.expectOne('/api-test/tipos-alojamiento').flush([{ id: 2, nombre: 'Casa' }]);
    controller.verify();
  });
});
