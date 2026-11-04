import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { environment } from '@env/environment';
import { authTokenInterceptor } from '@features/auth/application/interceptors/auth-token.interceptor';
import { SESSION_STORAGE_KEY, SessionService } from '@features/auth/application/session.service';
import { PaginaPublicacionesResponseDto } from '../dtos/publicacion.dto';
import { PublicacionHttpRepository } from './publicacion-http.repository';

describe('PublicacionHttpRepository: listarPropias', () => {
  const base = '/api-test';
  const pagina: PaginaPublicacionesResponseDto = {
    contenido: [
      {
        idPublicacion: 12,
        titulo: 'La más reciente',
        estado: 'ACTIVA',
        ciudad: { id: 1, nombre: 'Bogotá' },
        tipo: { id: 2, nombre: 'Casa' },
        capacidad: 6,
        precioNoche: 300000.5,
      },
      {
        idPublicacion: 7,
        titulo: 'La más antigua',
        estado: 'BORRADOR',
        ciudad: { id: 4, nombre: 'Cali' },
        tipo: { id: 1, nombre: 'Apartamento' },
        capacidad: 2,
        precioNoche: 100000,
      },
    ],
    pagina: 0,
    tamano: 10,
    totalElementos: 2,
    totalPaginas: 1,
    mensaje: null,
  };
  const error = (estado: number, nombre: string, mensaje: string, errores?: object) => ({
    body: { fecha: '2026-01-01T00:00:00Z', estado, error: nombre, mensaje, ruta: '/x', errores },
    opts: { status: estado, statusText: nombre },
  });
  const peticion = (http: HttpTestingController, paginaPedida: string, tamano: string) =>
    http.expectOne(
      (req) =>
        req.url === `${base}/publicaciones/mias` &&
        req.params.get('pagina') === paginaPedida &&
        req.params.get('tamano') === tamano,
    );

  let repository: PublicacionHttpRepository;
  let http: HttpTestingController;
  let session: SessionService;

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authTokenInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { ...environment, apiUrl: base, logLevel: 'error' } },
        PublicacionHttpRepository,
      ],
    });
    repository = TestBed.inject(PublicacionHttpRepository);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    session.iniciar({
      accessToken: 'jwt-anfitrion',
      expiraEn: Date.now() + 3_600_000,
      usuario: {
        idUsuario: 3,
        primerNombre: 'Luis',
        primerApellido: 'Mora',
        correo: 'luis@correo.com',
        roles: ['ANFITRION'],
      },
    });
  });

  afterEach(() => {
    http.verify();
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  it('hace GET /publicaciones/mias con pagina y tamano, y con el token', () => {
    repository.listarPropias(0, 10).subscribe();

    const req = peticion(http, '0', '10');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-anfitrion');
    req.flush(pagina);
  });

  it('envía el número de página que se pide', () => {
    repository.listarPropias(3, 10).subscribe();

    peticion(http, '3', '10').flush({ ...pagina, pagina: 3 });
  });

  it('mapea la página y NO reordena: respeta el orden del backend', () => {
    let resultado: unknown;
    let ids: number[] = [];
    let primera: unknown;
    repository.listarPropias(0, 10).subscribe((p) => {
      resultado = p;
      ids = p.contenido.map((x) => x.idPublicacion);
      primera = p.contenido[0];
    });

    peticion(http, '0', '10').flush(pagina);

    expect(ids).toEqual([12, 7]);
    expect(primera).toEqual({
      idPublicacion: 12,
      titulo: 'La más reciente',
      estado: 'ACTIVA',
      ciudad: { id: 1, nombre: 'Bogotá' },
      tipo: { id: 2, nombre: 'Casa' },
      capacidad: 6,
      precioNoche: 300000.5,
    });
    expect(resultado).toEqual(
      jasmine.objectContaining({
        pagina: 0,
        tamano: 10,
        totalElementos: 2,
        totalPaginas: 1,
        mensaje: null,
      }),
    );
  });

  it('conserva el `mensaje` del backend cuando la lista viene vacía', () => {
    let mensaje: string | null | undefined;
    let total = -1;
    repository.listarPropias(0, 10).subscribe((p) => {
      mensaje = p.mensaje;
      total = p.contenido.length;
    });

    peticion(http, '0', '10').flush({
      contenido: [],
      pagina: 0,
      tamano: 10,
      totalElementos: 0,
      totalPaginas: 0,
      mensaje: 'No tiene publicaciones registradas',
    });

    expect(total).toBe(0);
    expect(mensaje).toBe('No tiene publicaciones registradas');
  });

  it('400 (paginación inválida) llega como ApiError con el error por campo', () => {
    let fallo: unknown;
    repository.listarPropias(0, 500).subscribe({ error: (e: unknown) => (fallo = e) });
    const { body, opts } = error(400, 'Bad Request', 'Los datos enviados no son válidos', {
      tamano: 'El tamaño debe estar entre 1 y 100',
    });

    peticion(http, '0', '500').flush(body, opts);

    expect(fallo).toBeInstanceOf(ApiError);
    expect((fallo as ApiError).status).toBe(400);
    expect((fallo as ApiError).fieldErrors).toEqual([
      { field: 'tamano', message: 'El tamaño debe estar entre 1 y 100' },
    ]);
  });

  it('401 cierra la sesión y llega como ApiError', () => {
    let fallo: unknown;
    repository.listarPropias(0, 10).subscribe({ error: (e: unknown) => (fallo = e) });
    const { body, opts } = error(401, 'Unauthorized', 'Debe iniciar sesión');

    peticion(http, '0', '10').flush(body, opts);

    expect((fallo as ApiError).status).toBe(401);
    expect(session.autenticado()).toBeFalse();
  });

  it('403 (sin rol Anfitrión) llega como ApiError y no cierra la sesión', () => {
    let fallo: unknown;
    repository.listarPropias(0, 10).subscribe({ error: (e: unknown) => (fallo = e) });
    const { body, opts } = error(403, 'Forbidden', 'No tiene permisos para esta operación');

    peticion(http, '0', '10').flush(body, opts);

    expect((fallo as ApiError).status).toBe(403);
    expect(session.autenticado()).toBeTrue();
  });
});
