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

describe('ANFITRION_ROUTES: /anfitrion/publicaciones/:id (detalle)', () => {
  const RUTA = '/anfitrion/publicaciones/9';
  const API = '/api-test';
  const PUBLICACION = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'ACTIVA',
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: null,
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 0,
    reglas: null,
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

  it('un Anfitrión entra, el id llega a la pantalla y se pide esa publicación', async () => {
    iniciarSesionCon('ANFITRION');
    const controller = TestBed.inject(HttpTestingController);

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    expect(url()).toBe(RUTA);
    controller.expectOne(`${API}/publicaciones/9`).flush(PUBLICACION);
    harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('h1')!.textContent).toContain(
      'Apartamento luminoso',
    );
    controller.verify();
  });

  it('el detalle NO pide los catálogos (eso es solo del formulario)', async () => {
    iniciarSesionCon('ANFITRION');
    const controller = TestBed.inject(HttpTestingController);

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(RUTA);

    controller.expectNone(`${API}/ciudades`);
    controller.expectNone(`${API}/tipos-alojamiento`);
    controller.expectOne(`${API}/publicaciones/9`).flush(PUBLICACION);
    controller.verify();
  });

  it('no se confunde con "nueva" ni con "editar": cada una abre su propia pantalla', async () => {
    iniciarSesionCon('ANFITRION');
    const controller = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/anfitrion/publicaciones/nueva');
    controller.expectOne(`${API}/ciudades`).flush([]);
    controller.expectOne(`${API}/tipos-alojamiento`).flush([]);
    expect(url()).toBe('/anfitrion/publicaciones/nueva');

    await harness.navigateByUrl('/anfitrion/publicaciones/9/editar');
    controller.expectOne(`${API}/ciudades`).flush([]);
    controller.expectOne(`${API}/tipos-alojamiento`).flush([]);
    controller.expectOne(`${API}/publicaciones/9`).flush(PUBLICACION);
    expect(url()).toBe('/anfitrion/publicaciones/9/editar');
    controller.verify();
  });
});
