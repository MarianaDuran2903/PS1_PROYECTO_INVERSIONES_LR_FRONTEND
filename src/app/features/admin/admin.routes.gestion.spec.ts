import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { environment } from '@env/environment';
import { rolGuard } from '@features/auth/application/guards/access.guards';
import { SESSION_STORAGE_KEY, SessionService } from '@features/auth/application/session.service';
import { RolUsuario } from '@features/auth/domain/models/rol-usuario';
import { ADMIN_ROUTES } from './admin.routes';

@Component({ template: 'Sin permisos' })
class SinPermisosStub {}

@Component({ template: 'Login' })
class LoginStub {}

/** HU-015: la gestión de publicaciones y el detalle son solo para el Administrador. */
describe('ADMIN_ROUTES: gestión de publicaciones y detalle del Administrador', () => {
  const API = '/api-test/admin/publicaciones';
  const PAGINA_VACIA = {
    contenido: [],
    pagina: 0,
    tamano: 10,
    totalElementos: 0,
    totalPaginas: 0,
    mensaje: 'No hay publicaciones pendientes de revisión',
  };
  const PUBLICACION = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'BLOQUEADA',
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: 'Chapinero',
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 0,
    reglas: 'No fumar',
    motivoBloqueo: 'Las fotos no corresponden',
  };
  const RUTAS = [
    '/admin/publicaciones',
    '/admin/publicaciones/9',
    '/admin/publicaciones/pendientes',
  ];

  let session: SessionService;
  let controller: HttpTestingController;

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
  const sinPeticiones = () => controller.expectNone((r) => r.url.startsWith(API));

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
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { ...environment, apiUrl: '/api-test', logLevel: 'error' },
        },
      ],
    });
    session = TestBed.inject(SessionService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  for (const ruta of RUTAS) {
    for (const rol of ['ANFITRION', 'HUESPED'] as const) {
      it(`un ${rol} (sin rol Administrador) es denegado en ${ruta} y no se hace ninguna petición`, async () => {
        iniciarSesionCon(rol);

        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(ruta);

        expect(url()).toBe('/acceso-denegado');
        sinPeticiones();
        controller.verify();
      });
    }

    it(`sin sesión ${ruta} va al login recordando la ruta`, async () => {
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(ruta);

      expect(url()).toContain('/login?returnUrl=');
      sinPeticiones();
    });
  }

  it('/admin/publicaciones muestra la gestión y pide las pendientes, la pestaña inicial', async () => {
    iniciarSesionCon('ADMINISTRADOR');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/publicaciones');
    const req = controller.expectOne((r) => r.url === `${API}/pendientes`);
    req.flush(PAGINA_VACIA);
    harness.detectChanges();

    expect(url()).toBe('/admin/publicaciones');
    expect(harness.routeNativeElement!.tagName.toLowerCase()).toBe(
      'app-gestion-publicaciones-page',
    );
    expect(harness.routeNativeElement!.querySelectorAll('[role="tab"]').length).toBe(5);
    controller.verify();
  });

  it('/admin/publicaciones/pendientes sigue siendo la bandeja y no se toma por un id', async () => {
    iniciarSesionCon('ADMINISTRADOR');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/publicaciones/pendientes');
    controller.expectOne((r) => r.url === `${API}/pendientes`).flush(PAGINA_VACIA);

    expect(harness.routeNativeElement!.tagName.toLowerCase()).toBe('app-bandeja-pendientes-page');
    controller.verify();
  });

  it('/admin/publicaciones/:id muestra el detalle y lo pide por la ruta de administrador', async () => {
    iniciarSesionCon('ADMINISTRADOR');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/publicaciones/9');
    controller.expectOne(`${API}/9`).flush(PUBLICACION);
    harness.detectChanges();

    expect(url()).toBe('/admin/publicaciones/9');
    expect(harness.routeNativeElement!.tagName.toLowerCase()).toBe(
      'app-detalle-publicacion-admin-page',
    );
    expect(harness.routeNativeElement!.textContent).toContain('Las fotos no corresponden');
    controller.verify();
  });

  it('el detalle de una publicación inexistente avisa y vuelve a la gestión', async () => {
    iniciarSesionCon('ADMINISTRADOR');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/publicaciones/9');
    controller.expectOne(`${API}/9`).flush(
      {
        fecha: '2026-01-01T00:00:00Z',
        estado: 404,
        error: 'Not Found',
        mensaje: 'La publicación no existe',
        ruta: `${API}/9`,
      },
      { status: 404, statusText: 'Not Found' },
    );
    await harness.fixture.whenStable();

    expect(url()).toBe('/admin/publicaciones');
    controller.expectOne((r) => r.url === `${API}/pendientes`).flush(PAGINA_VACIA);
  });

  it('la ruta de intervención sigue existiendo y es solo para el Administrador', async () => {
    iniciarSesionCon('ANFITRION');

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/publicaciones/9/editar');

    expect(url()).toBe('/acceso-denegado');
    sinPeticiones();
  });
});
