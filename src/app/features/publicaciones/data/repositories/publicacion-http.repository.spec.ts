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
import { PublicacionInvalidaError } from '../../domain/errors/publicacion.errors';
import { NuevaPublicacion } from '../../domain/models/publicacion';
import { PublicacionResponseDto } from '../dtos/publicacion.dto';
import { PublicacionHttpRepository } from './publicacion-http.repository';

describe('PublicacionHttpRepository', () => {
  const base = '/api-test';
  const datos: NuevaPublicacion = {
    titulo: '  Apartamento luminoso ',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    idCiudad: 1,
    barrioZona: '   ',
    idTipo: 2,
    capacidad: 4,
    precioNoche: 250000.5,
  };
  const respuesta: PublicacionResponseDto = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'BORRADOR',
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: null,
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Apartamento' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000.5,
    tarifaLimpieza: 0,
  };
  const error = (estado: number, nombre: string, mensaje: string, errores?: object) => ({
    body: { fecha: '2026-01-01T00:00:00Z', estado, error: nombre, mensaje, ruta: '/x', errores },
    opts: { status: estado, statusText: nombre },
  });

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
        {
          provide: APP_CONFIG,
          useValue: { ...environment, apiUrl: base, logLevel: 'error' },
        },
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

  describe('catálogos', () => {
    it('ciudades: GET /ciudades con el token de la sesión', () => {
      let nombres: string[] = [];
      repository.ciudades().subscribe((items) => (nombres = items.map((i) => i.nombre)));

      const req = http.expectOne(`${base}/ciudades`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-anfitrion');
      req.flush([
        { id: 1, nombre: 'Bogotá' },
        { id: 2, nombre: 'Medellín' },
      ]);

      expect(nombres).toEqual(['Bogotá', 'Medellín']);
    });

    it('tiposAlojamiento: GET /tipos-alojamiento con el token de la sesión', () => {
      let total = 0;
      repository.tiposAlojamiento().subscribe((items) => (total = items.length));

      const req = http.expectOne(`${base}/tipos-alojamiento`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-anfitrion');
      req.flush([{ id: 2, nombre: 'Apartamento' }]);

      expect(total).toBe(1);
    });
  });

  describe('crear', () => {
    it('hace POST /publicaciones con el token y un cuerpo sin idAnfitrion, estado ni politica', () => {
      let idPublicacion: number | undefined;
      repository.crear(datos).subscribe((p) => (idPublicacion = p.idPublicacion));

      const req = http.expectOne(`${base}/publicaciones`);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-anfitrion');
      expect(req.request.body).toEqual({
        titulo: 'Apartamento luminoso',
        descripcion: 'Cerca del parque',
        direccionTextual: 'Calle 10 # 5-20',
        idCiudad: 1,
        barrioZona: null,
        idTipo: 2,
        capacidad: 4,
        precioNoche: 250000.5,
      });
      for (const campo of ['idAnfitrion', 'estado', 'politica']) {
        expect(campo in req.request.body).toBeFalse();
      }
      expect(typeof req.request.body.capacidad).toBe('number');
      expect(typeof req.request.body.precioNoche).toBe('number');
      req.flush(respuesta);

      expect(idPublicacion).toBe(9);
    });

    it('mapea la respuesta 201 con el estado BORRADOR y la política Flexible', () => {
      let estado = '';
      let politica = '';
      repository.crear(datos).subscribe((p) => {
        estado = p.estado;
        politica = p.politica.nombre;
      });

      http.expectOne(`${base}/publicaciones`).flush(respuesta);

      expect(estado).toBe('BORRADOR');
      expect(politica).toBe('Flexible');
    });

    it('400 con errores se convierte en PublicacionInvalidaError por campo', () => {
      let fallo: unknown;
      repository.crear(datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(400, 'Bad Request', 'Los datos enviados no son válidos', {
        idCiudad: 'La ciudad no existe',
        campoDesconocido: 'ignorado',
      });

      http.expectOne(`${base}/publicaciones`).flush(body, opts);

      expect(fallo).toBeInstanceOf(PublicacionInvalidaError);
      expect((fallo as PublicacionInvalidaError).errores).toEqual({
        idCiudad: 'La ciudad no existe',
      });
    });

    it('400 sin errores llega como ApiError con el mensaje', () => {
      let fallo: unknown;
      repository.crear(datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(400, 'Bad Request', 'El cuerpo de la petición no es válido');

      http.expectOne(`${base}/publicaciones`).flush(body, opts);

      expect(fallo).toBeInstanceOf(ApiError);
      expect((fallo as ApiError).message).toBe('El cuerpo de la petición no es válido');
    });

    it('403 llega como ApiError y no cierra la sesión', () => {
      let fallo: unknown;
      repository.crear(datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(403, 'Forbidden', 'No tiene permisos para esta operación');

      http.expectOne(`${base}/publicaciones`).flush(body, opts);

      expect((fallo as ApiError).status).toBe(403);
      expect(session.autenticado()).toBeTrue();
    });

    it('401 llega como ApiError y el interceptor cierra la sesión', () => {
      let fallo: unknown;
      repository.crear(datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(401, 'Unauthorized', 'Token inválido');

      http.expectOne(`${base}/publicaciones`).flush(body, opts);

      expect((fallo as ApiError).status).toBe(401);
      expect(session.autenticado()).toBeFalse();
    });
  });
});
