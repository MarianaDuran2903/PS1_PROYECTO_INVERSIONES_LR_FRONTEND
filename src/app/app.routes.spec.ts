import { provideHttpClient, withInterceptors } from '@angular/common/http';
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
import { authTokenInterceptor } from '@features/auth/application/interceptors/auth-token.interceptor';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';

/** HU-014: el listado público de alojamientos y el Marketplace que lo reutiliza. */
describe('routes: exploración pública y Marketplace del Huésped', () => {
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
        servicios: [],
      },
    ],
    pagina: 0,
    tamano: 12,
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

  const responderCatalogos = () => {
    controller.expectOne(`${API}/alojamientos/ciudades`).flush([{ id: 2, nombre: 'Medellín' }]);

    controller.expectOne(`${API}/catalogos/tipos-alojamiento`).flush([{ id: 4, nombre: 'Cabaña' }]);

    controller.expectOne(`${API}/catalogos/servicios`).flush([]);
  };

  const listadoPublico = (harness: RouterTestingHarness) => {
    const peticion = controller.expectOne((request) => request.url === LISTADO);

    peticion.flush(PAGINA);
    responderCatalogos();
    harness.detectChanges();

    return peticion.request;
  };

  const listadoMarketplace = (harness: RouterTestingHarness) => {
    const peticion = controller.expectOne((request) => request.url === LISTADO);

    peticion.flush({ ...PAGINA, tamano: 10 });
    harness.detectChanges();

    return peticion.request;
  };

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);

    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(withInterceptors([authTokenInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: {
            ...environment,
            apiUrl: API,
            logLevel: 'error',
          },
        },
        {
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
    it('un Visitante entra a la búsqueda de F07 sin pasar por el login', async () => {
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/alojamientos');

      const peticion = listadoPublico(harness);

      expect(url()).toBe('/alojamientos');
      expect(harness.routeNativeElement!.tagName.toLowerCase()).toBe(
        'app-busqueda-alojamientos-page',
      );
      expect(harness.routeNativeElement!.textContent).toContain('Cabaña en la montaña');
      expect(peticion.method).toBe('GET');
      expect(peticion.params.get('tamano')).toBe('12');
      expect(peticion.headers.has('Authorization')).toBeFalse();
    });

    it('un Huésped entra y la consulta pública no lleva token', async () => {
      iniciarSesionCon('HUESPED');

      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/alojamientos');

      const peticion = listadoPublico(harness);

      expect(url()).toBe('/alojamientos');
      expect(peticion.headers.has('Authorization')).toBeFalse();
      expect(session.autenticado()).toBeTrue();
    });

    it('un Anfitrión se dirige a sus publicaciones, sin consultar la búsqueda pública', async () => {
      iniciarSesionCon('ANFITRION');

      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/alojamientos');

      controller.expectNone((request) => request.url === LISTADO);

      controller
        .expectOne((request) => request.url === `${API}/publicaciones/mias`)
        .flush({
          contenido: [],
          pagina: 0,
          tamano: 10,
          totalElementos: 0,
          totalPaginas: 0,
          mensaje: 'No tiene publicaciones registradas',
        });

      harness.detectChanges();

      expect(url()).toBe('/anfitrion/publicaciones');
    });

    it('restaura página y características desde los parámetros de búsqueda', async () => {
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl(
        '/alojamientos?pagina=2&idCiudad=2&idTipo=4' +
          '&precioMinimo=0&precioMaximo=400000' +
          '&idsServicios=1&idsServicios=3',
      );

      const peticion = controller.expectOne((request) => request.url === LISTADO);

      expect(peticion.request.params.get('pagina')).toBe('2');
      expect(peticion.request.params.get('idCiudad')).toBe('2');
      expect(peticion.request.params.get('idTipo')).toBe('4');
      expect(peticion.request.params.get('precioMinimo')).toBe('0');
      expect(peticion.request.params.get('precioMaximo')).toBe('400000');
      expect(peticion.request.params.getAll('idsServicios')).toEqual(['1', '3']);

      peticion.flush({
        ...PAGINA,
        pagina: 2,
        totalElementos: 25,
        totalPaginas: 3,
      });

      responderCatalogos();
      harness.detectChanges();

      expect(harness.routeNativeElement!.textContent).toContain('Página 3 de 3');
    });
  });

  describe('/alojamientos/:idPublicacion', () => {
    it('un Visitante abre directamente el detalle de F07', async () => {
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/alojamientos/3');

      const peticion = controller.expectOne(`${API}/alojamientos/3`);

      expect(peticion.request.headers.has('Authorization')).toBeFalse();

      peticion.flush({
        idPublicacion: 3,
        titulo: 'Cabaña en la montaña',
        descripcion: 'Una estancia tranquila.',
        estado: 'ACTIVA',
        ciudad: { id: 2, nombre: 'Medellín' },
        barrioZona: null,
        tipo: { id: 4, nombre: 'Cabaña' },
        capacidad: 6,
        precioNoche: 320000,
        reglas: 'No fumar.',
        politica: {
          id: 1,
          nombre: 'Flexible',
          horasAnticipacionMin: 24,
          porcentajeDevolucion: 100,
        },
        servicios: [],
        imagenes: [],
      });

      harness.detectChanges();

      expect(url()).toBe('/alojamientos/3');
      expect(harness.routeNativeElement!.tagName.toLowerCase()).toBe(
        'app-alojamiento-detalle-page',
      );
      expect(harness.routeNativeElement!.textContent).toContain('Cabaña en la montaña');

      controller.expectNone((request) => request.url === LISTADO);
      controller.expectNone(`${API}/catalogos/tipos-alojamiento`);
    });
  });

  describe('/marketplace', () => {
    it('un Huésped conserva el listado existente de su área', async () => {
      iniciarSesionCon('HUESPED');

      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/marketplace');

      const peticion = listadoMarketplace(harness);

      expect(url()).toBe('/marketplace');
      expect(harness.routeNativeElement!.tagName.toLowerCase()).toBe('app-alojamientos-page');
      expect(harness.routeNativeElement!.textContent).toContain('Cabaña en la montaña');
      expect(peticion.headers.has('Authorization')).toBeFalse();
    });

    it('un Anfitrión no entra al Marketplace ni consulta el listado', async () => {
      iniciarSesionCon('ANFITRION');

      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/marketplace');

      expect(url()).toBe('/acceso-denegado');
      controller.expectNone((request) => request.url === LISTADO);
    });

    it('sin sesión va al login recordando la ruta', async () => {
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/marketplace');

      expect(url()).toContain('/login?returnUrl=');
      controller.expectNone((request) => request.url === LISTADO);
    });
  });
});
