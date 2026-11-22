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

describe('ANFITRION_ROUTES: calendario de disponibilidad', () => {
  const RUTA = '/anfitrion/publicaciones/12/disponibilidad';
  const API = '/api-test';

  let session: SessionService;

  const iniciarSesionCon = (rol: RolUsuario) =>
    session.iniciar({
      accessToken: 't',
      expiraEn: Date.now() + 3_600_000,
      usuario: {
        idUsuario: 1,
        primerNombre: 'Ana',
        primerApellido: 'Ruiz',
        correo: 'a@b.co',
        roles: [rol],
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

  it('permite al Anfitrión consultar el calendario desde la API', async () => {
    iniciarSesionCon(RolUsuario.Anfitrion);
    const controller = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl(RUTA);

    expect(url()).toBe(RUTA);
    controller.expectOne(API + '/publicaciones/12/disponibilidad').flush({
      idPublicacion: 12,
      titulo: 'Casa propia',
      periodos: [
        {
          idPeriodo: 4,
          fechaInicio: '2026-03-01',
          fechaFin: '2026-03-03',
          tipo: 'DISPONIBLE',
        },
        {
          idPeriodo: 5,
          fechaInicio: '2026-03-03',
          fechaFin: '2026-03-04',
          tipo: 'NO_OFRECIDO',
        },
      ],
    });
    harness.detectChanges();

    expect(harness.routeNativeElement!.textContent).toContain('Casa propia');
    expect(harness.routeNativeElement!.textContent).toContain('Disponible');
    expect(harness.routeNativeElement!.textContent).toContain('No ofrecido');
    controller.verify();
  });

  it('deniega el acceso a un Huésped antes de consultar la API', async () => {
    iniciarSesionCon(RolUsuario.Huesped);
    const controller = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl(RUTA);

    expect(url()).toBe('/acceso-denegado');
    controller.expectNone(API + '/publicaciones/12/disponibilidad');
    controller.verify();
  });
});
