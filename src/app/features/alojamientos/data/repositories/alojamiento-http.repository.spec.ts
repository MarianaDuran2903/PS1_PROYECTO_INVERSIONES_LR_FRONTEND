import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { environment } from '@env/environment';
import { authTokenInterceptor } from '@features/auth/application/interceptors/auth-token.interceptor';
import { SESSION_STORAGE_KEY, SessionService } from '@features/auth/application/session.service';
import { PaginaPublicacionesResponseDto } from '@features/publicaciones/data/dtos/publicacion.dto';
import { AlojamientoHttpRepository } from './alojamiento-http.repository';

/** HU-014: el listado público de alojamientos disponibles (sin token). */
describe('AlojamientoHttpRepository', () => {
  const url = '/api-test/alojamientos';
  const cuerpo: PaginaPublicacionesResponseDto = {
    contenido: [
      {
        idPublicacion: 12,
        titulo: 'Cabaña en la montaña',
        estado: 'ACTIVA',
        ciudad: { id: 2, nombre: 'Medellín' },
        tipo: { id: 4, nombre: 'Cabaña' },
        capacidad: 6,
        precioNoche: 320000,
      },
      {
        idPublicacion: 7,
        titulo: 'Apartamento en el centro',
        estado: 'ACTIVA',
        ciudad: { id: 3, nombre: 'Cartagena' },
        tipo: { id: 1, nombre: 'Apartamento' },
        capacidad: 2,
        precioNoche: 180000,
      },
    ],
    pagina: 1,
    tamano: 10,
    totalElementos: 12,
    totalPaginas: 2,
    mensaje: null,
  };

  let repository: AlojamientoHttpRepository;
  let http: HttpTestingController;
  let session: SessionService;

  beforeEach(() => {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authTokenInterceptor, httpErrorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { ...environment, apiUrl: '/api-test', logLevel: 'error' },
        },
        AlojamientoHttpRepository,
      ],
    });
    repository = TestBed.inject(AlojamientoHttpRepository);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
  });

  afterEach(() => {
    http.verify();
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  it('hace GET a /alojamientos con pagina y tamano', () => {
    repository.listar(1, 10).subscribe();

    const req = http.expectOne((r) => r.url === url);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('pagina')).toBe('1');
    expect(req.request.params.get('tamano')).toBe('10');
    req.flush(cuerpo);
  });

  it('no envía Authorization aunque haya una sesión abierta', () => {
    session.iniciar({
      accessToken: 'abc',
      expiraEn: Date.now() + 3_600_000,
      usuario: {
        idUsuario: 1,
        primerNombre: 'Ana',
        primerApellido: 'Ruiz',
        correo: 'a@b.co',
        roles: ['HUESPED'],
      },
    });

    repository.listar(0, 10).subscribe();

    const req = http.expectOne((r) => r.url === url);
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush(cuerpo);
  });

  it('convierte la página en el resumen de siempre, en el orden que llega', () => {
    let pagina: unknown;
    repository.listar(1, 10).subscribe((p) => (pagina = p));

    http.expectOne((r) => r.url === url).flush(cuerpo);

    expect(pagina).toEqual({
      contenido: [
        {
          idPublicacion: 12,
          titulo: 'Cabaña en la montaña',
          estado: 'ACTIVA',
          ciudad: { id: 2, nombre: 'Medellín' },
          tipo: { id: 4, nombre: 'Cabaña' },
          capacidad: 6,
          precioNoche: 320000,
        },
        {
          idPublicacion: 7,
          titulo: 'Apartamento en el centro',
          estado: 'ACTIVA',
          ciudad: { id: 3, nombre: 'Cartagena' },
          tipo: { id: 1, nombre: 'Apartamento' },
          capacidad: 2,
          precioNoche: 180000,
        },
      ],
      pagina: 1,
      tamano: 10,
      totalElementos: 12,
      totalPaginas: 2,
      mensaje: null,
    });
  });

  it('conserva el mensaje de la API cuando no hay alojamientos', () => {
    let mensaje: string | null = null;
    repository.listar(0, 10).subscribe((p) => (mensaje = p.mensaje));

    http
      .expectOne((r) => r.url === url)
      .flush({
        contenido: [],
        pagina: 0,
        tamano: 10,
        totalElementos: 0,
        totalPaginas: 0,
        mensaje: 'No hay alojamientos disponibles por el momento',
      });

    expect(mensaje as string | null).toBe('No hay alojamientos disponibles por el momento');
  });

  it('un 400 de paginación llega como ApiError con su mensaje', () => {
    let recibido: unknown;
    repository.listar(0, 500).subscribe({ error: (e: unknown) => (recibido = e) });

    http
      .expectOne((r) => r.url === url)
      .flush(
        {
          fecha: '2026-01-01T00:00:00Z',
          estado: 400,
          error: 'Bad Request',
          mensaje: 'El tamaño debe estar entre 1 y 100',
          ruta: url,
        },
        { status: 400, statusText: 'Bad Request' },
      );

    expect(recibido).toBeInstanceOf(ApiError);
    expect((recibido as ApiError).message).toBe('El tamaño debe estar entre 1 y 100');
  });

  it('un 401 no cierra la sesión ni lleva al login: es una ruta pública', () => {
    session.iniciar({
      accessToken: 'abc',
      expiraEn: Date.now() + 3_600_000,
      usuario: {
        idUsuario: 1,
        primerNombre: 'Ana',
        primerApellido: 'Ruiz',
        correo: 'a@b.co',
        roles: ['HUESPED'],
      },
    });
    const navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    repository.listar(0, 10).subscribe({ error: () => undefined });

    http
      .expectOne((r) => r.url === url)
      .flush(
        {
          fecha: '2026-01-01T00:00:00Z',
          estado: 401,
          error: 'Unauthorized',
          mensaje: 'Debe iniciar sesión',
          ruta: url,
        },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(session.autenticado()).toBeTrue();
    expect(navegar).not.toHaveBeenCalled();
  });
});
