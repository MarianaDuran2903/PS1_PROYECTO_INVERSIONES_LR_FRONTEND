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
import {
  PaginaPublicacionesCompletasResponseDto,
  PublicacionResponseDto,
} from '@features/publicaciones/data/dtos/publicacion.dto';
import {
  InformacionMinimaIncompletaError,
  PublicacionNoEncontradaError,
  TransicionNoPermitidaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import { MotivoInvalidoError } from '../../domain/errors/revision.errors';
import { PublicacionAdminHttpRepository } from './publicacion-admin-http.repository';

/** HU-013: la bandeja de pendientes y la decisión del Administrador (aprobar o rechazar). */
describe('PublicacionAdminHttpRepository: revisión de pendientes', () => {
  const base = '/api-test/admin/publicaciones';
  const dto = (estado: PublicacionResponseDto['estado'], id = 9): PublicacionResponseDto => ({
    idPublicacion: id,
    idAnfitrion: 3,
    estado,
    titulo: 'Casa renovada',
    descripcion: 'Con terraza',
    direccionTextual: 'Carrera 7 # 8-9',
    barrioZona: 'Chapinero',
    ciudad: { id: 4, nombre: 'Cali' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 6,
    precioNoche: 300000.5,
    tarifaLimpieza: 50000,
    reglas: 'No fumar',
  });
  const error = (estado: number, nombre: string, mensaje: string, errores?: object) => ({
    body: { fecha: '2026-01-01T00:00:00Z', estado, error: nombre, mensaje, ruta: '/x', errores },
    opts: { status: estado, statusText: nombre },
  });

  let repository: PublicacionAdminHttpRepository;
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
        PublicacionAdminHttpRepository,
      ],
    });
    repository = TestBed.inject(PublicacionAdminHttpRepository);
    http = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    session.iniciar({
      accessToken: 'adm',
      expiraEn: Date.now() + 3_600_000,
      usuario: {
        idUsuario: 1,
        primerNombre: 'Ana',
        primerApellido: 'Ruiz',
        correo: 'a@b.co',
        roles: ['ADMINISTRADOR'],
      },
    });
  });

  afterEach(() => {
    http.verify();
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  describe('listarPendientes', () => {
    it('hace GET a /admin/publicaciones/pendientes con pagina y tamano, y el token', () => {
      repository.listarPendientes(2, 10).subscribe();

      const req = http.expectOne((r) => r.url === `${base}/pendientes` && r.method === 'GET');
      expect(req.request.params.get('pagina')).toBe('2');
      expect(req.request.params.get('tamano')).toBe('10');
      expect(req.request.headers.get('Authorization')).toBe('Bearer adm');
      req.flush({
        contenido: [],
        pagina: 2,
        tamano: 10,
        totalElementos: 0,
        totalPaginas: 0,
        mensaje: null,
      });
    });

    it('convierte la página con publicaciones completas y la deja en el orden que llega', () => {
      let pagina: unknown;
      repository.listarPendientes(0, 10).subscribe((p) => (pagina = p));
      const cuerpo: PaginaPublicacionesCompletasResponseDto = {
        contenido: [dto('PENDIENTE_REVISION', 5), dto('PENDIENTE_REVISION', 2)],
        pagina: 0,
        tamano: 10,
        totalElementos: 2,
        totalPaginas: 1,
        mensaje: null,
      };

      http.expectOne((r) => r.url === `${base}/pendientes`).flush(cuerpo);

      const recibida = pagina as { contenido: { idPublicacion: number; reglas: string | null }[] };
      expect(recibida.contenido.map((p) => p.idPublicacion)).toEqual([5, 2]);
      expect(recibida.contenido[0]).toEqual(
        jasmine.objectContaining({ idAnfitrion: 3, tarifaLimpieza: 50000, reglas: 'No fumar' }),
      );
    });

    it('conserva el mensaje de la API cuando no hay pendientes', () => {
      let mensaje: string | null = null;
      repository.listarPendientes(0, 10).subscribe((p) => (mensaje = p.mensaje));

      http
        .expectOne((r) => r.url === `${base}/pendientes`)
        .flush({
          contenido: [],
          pagina: 0,
          tamano: 10,
          totalElementos: 0,
          totalPaginas: 0,
          mensaje: 'No hay publicaciones pendientes de revisión',
        });

      expect(mensaje as string | null).toBe('No hay publicaciones pendientes de revisión');
    });

    it('un 400 de paginación llega como ApiError con su mensaje', () => {
      let recibido: unknown;
      repository.listarPendientes(0, 500).subscribe({ error: (e: unknown) => (recibido = e) });
      const { body, opts } = error(400, 'Bad Request', 'El tamaño debe estar entre 1 y 100');

      http.expectOne((r) => r.url === `${base}/pendientes`).flush(body, opts);

      expect(recibido).toBeInstanceOf(ApiError);
      expect((recibido as ApiError).message).toBe('El tamaño debe estar entre 1 y 100');
    });
  });

  describe('aprobar', () => {
    const fallo = (estado: number, nombre: string, mensaje: string, errores?: object) => {
      let recibido: unknown;
      repository.aprobar(9).subscribe({ error: (e: unknown) => (recibido = e) });
      const { body, opts } = error(estado, nombre, mensaje, errores);
      http.expectOne(`${base}/9/aprobar`).flush(body, opts);
      return recibido;
    };

    it('hace POST a /admin/publicaciones/{id}/aprobar, sin cuerpo y con el token', () => {
      let estado: string | undefined;
      repository.aprobar(9).subscribe((p) => (estado = p.estado));

      const req = http.expectOne(`${base}/9/aprobar`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.headers.get('Authorization')).toBe('Bearer adm');
      req.flush(dto('ACTIVA'));

      expect(estado).toBe('ACTIVA');
    });

    it('un 400 con campos pendientes llega como InformacionMinimaIncompletaError', () => {
      const recibido = fallo(
        400,
        'Bad Request',
        'La publicación no tiene la información mínima para activarse',
        {
          reglas: 'Las reglas son obligatorias para solicitar la activación',
          descripcion: 'La descripción es obligatoria para solicitar la activación',
          raro: 'ignorado',
        },
      );

      expect(recibido).toBeInstanceOf(InformacionMinimaIncompletaError);
      expect((recibido as InformacionMinimaIncompletaError).pendientes).toEqual({
        reglas: 'Las reglas son obligatorias para solicitar la activación',
        descripcion: 'La descripción es obligatoria para solicitar la activación',
      });
      expect((recibido as Error).message).toBe(
        'La publicación no tiene la información mínima para activarse',
      );
    });

    it('un 400 sin campos conocidos llega como ApiError', () => {
      expect(fallo(400, 'Bad Request', 'Solicitud inválida')).toBeInstanceOf(ApiError);
    });

    it('un 404 llega como PublicacionNoEncontradaError', () => {
      expect(fallo(404, 'Not Found', 'La publicación no existe')).toBeInstanceOf(
        PublicacionNoEncontradaError,
      );
    });

    it('un 409 llega como TransicionNoPermitidaError con el mensaje del backend', () => {
      const recibido = fallo(409, 'Conflict', 'La publicación no está pendiente de revisión');

      expect(recibido).toBeInstanceOf(TransicionNoPermitidaError);
      expect((recibido as Error).message).toBe('La publicación no está pendiente de revisión');
    });

    it('un 500 llega como ApiError', () => {
      expect(fallo(500, 'Internal Server Error', 'detalle interno')).toBeInstanceOf(ApiError);
    });
  });

  describe('rechazar', () => {
    const fallo = (estado: number, nombre: string, mensaje: string, errores?: object) => {
      let recibido: unknown;
      repository.rechazar(9, 'Las fotos no corresponden').subscribe({
        error: (e: unknown) => (recibido = e),
      });
      const { body, opts } = error(estado, nombre, mensaje, errores);
      http.expectOne(`${base}/9/rechazar`).flush(body, opts);
      return recibido;
    };

    it('hace POST a /admin/publicaciones/{id}/rechazar con el motivo recortado', () => {
      let estado: string | undefined;
      repository
        .rechazar(9, '  Las fotos no corresponden al alojamiento  ')
        .subscribe((p) => (estado = p.estado));

      const req = http.expectOne(`${base}/9/rechazar`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ motivo: 'Las fotos no corresponden al alojamiento' });
      expect(req.request.headers.get('Authorization')).toBe('Bearer adm');
      req.flush(dto('BORRADOR'));

      expect(estado).toBe('BORRADOR');
    });

    it('un 400 con errores.motivo llega como MotivoInvalidoError con su mensaje', () => {
      const recibido = fallo(400, 'Bad Request', 'Los datos enviados no son válidos', {
        motivo: 'El motivo debe tener entre 10 y 500 caracteres',
      });

      expect(recibido).toBeInstanceOf(MotivoInvalidoError);
      expect((recibido as Error).message).toBe('El motivo debe tener entre 10 y 500 caracteres');
    });

    it('un 400 sin errores.motivo llega como ApiError', () => {
      expect(fallo(400, 'Bad Request', 'Solicitud inválida')).toBeInstanceOf(ApiError);
      expect(fallo(400, 'Bad Request', 'Solicitud inválida', { otro: 'x' })).toBeInstanceOf(
        ApiError,
      );
    });

    it('un 404 llega como PublicacionNoEncontradaError', () => {
      expect(fallo(404, 'Not Found', 'La publicación no existe')).toBeInstanceOf(
        PublicacionNoEncontradaError,
      );
    });

    it('un 409 llega como TransicionNoPermitidaError con el mensaje del backend', () => {
      const recibido = fallo(409, 'Conflict', 'La publicación no está pendiente de revisión');

      expect(recibido).toBeInstanceOf(TransicionNoPermitidaError);
      expect((recibido as Error).message).toBe('La publicación no está pendiente de revisión');
    });

    it('un error de red llega como ApiError', () => {
      let recibido: unknown;
      repository.rechazar(9, 'Las fotos no corresponden').subscribe({
        error: (e: unknown) => (recibido = e),
      });

      http.expectOne(`${base}/9/rechazar`).error(new ProgressEvent('error'));

      expect(recibido).toBeInstanceOf(ApiError);
    });
  });
});
