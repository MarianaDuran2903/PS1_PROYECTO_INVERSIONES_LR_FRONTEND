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

/** HU-015: la gestión del Administrador (listar por estado, bloquear y reactivar). */
describe('PublicacionAdminHttpRepository: gestión de publicaciones', () => {
  const base = '/api-test/admin/publicaciones';
  const dto = (
    estado: PublicacionResponseDto['estado'],
    id = 9,
    motivoBloqueo?: string | null,
  ): PublicacionResponseDto => ({
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
    ...(motivoBloqueo !== undefined ? { motivoBloqueo } : {}),
  });
  const pagina = (
    contenido: PublicacionResponseDto[],
  ): PaginaPublicacionesCompletasResponseDto => ({
    contenido,
    pagina: 0,
    tamano: 10,
    totalElementos: contenido.length,
    totalPaginas: 1,
    mensaje: null,
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

  describe('listar', () => {
    it('con un estado hace GET a /admin/publicaciones con estado, pagina y tamano, y el token', () => {
      repository.listar('PAUSADA', 1, 10).subscribe();

      const req = http.expectOne((r) => r.url === base && r.method === 'GET');
      expect(req.request.params.get('estado')).toBe('PAUSADA');
      expect(req.request.params.get('pagina')).toBe('1');
      expect(req.request.params.get('tamano')).toBe('10');
      expect(req.request.headers.get('Authorization')).toBe('Bearer adm');
      req.flush(pagina([]));
    });

    it('con estado null no envía el parámetro estado (trae todas)', () => {
      repository.listar(null, 0, 10).subscribe();

      const req = http.expectOne((r) => r.url === base);
      expect(req.request.params.has('estado')).toBeFalse();
      expect(req.request.params.get('pagina')).toBe('0');
      expect(req.request.params.get('tamano')).toBe('10');
      req.flush(pagina([]));
    });

    for (const estado of [
      'BORRADOR',
      'PENDIENTE_REVISION',
      'ACTIVA',
      'PAUSADA',
      'BLOQUEADA',
    ] as const) {
      it(`envía el estado ${estado} en mayúsculas, tal como lo espera el backend`, () => {
        repository.listar(estado, 0, 10).subscribe();

        const req = http.expectOne((r) => r.url === base);
        expect(req.request.params.get('estado')).toBe(estado);
        req.flush(pagina([]));
      });
    }

    it('convierte la página con publicaciones completas, con y sin motivo de bloqueo', () => {
      let recibida: unknown;
      repository.listar(null, 0, 10).subscribe((p) => (recibida = p));

      http
        .expectOne((r) => r.url === base)
        .flush(
          pagina([
            dto('BLOQUEADA', 5, 'Las fotos no corresponden'),
            dto('ACTIVA', 4, null),
            dto('PAUSADA', 3),
          ]),
        );

      const contenido = (
        recibida as { contenido: { idPublicacion: number; motivoBloqueo: string | null }[] }
      ).contenido;
      expect(contenido.map((p) => [p.idPublicacion, p.motivoBloqueo])).toEqual([
        [5, 'Las fotos no corresponden'],
        [4, null],
        [3, null],
      ]);
    });

    it('conserva el mensaje de la API cuando no hay publicaciones', () => {
      let mensaje: string | null = null;
      repository.listar('ACTIVA', 0, 10).subscribe((p) => (mensaje = p.mensaje));

      http
        .expectOne((r) => r.url === base)
        .flush({
          ...pagina([]),
          totalElementos: 0,
          totalPaginas: 0,
          mensaje: 'No hay publicaciones para mostrar',
        });

      expect(mensaje as string | null).toBe('No hay publicaciones para mostrar');
    });

    it('un 400 de paginación llega como ApiError con su mensaje', () => {
      let recibido: unknown;
      repository.listar(null, 0, 500).subscribe({ error: (e: unknown) => (recibido = e) });
      const { body, opts } = error(400, 'Bad Request', 'El tamaño debe estar entre 1 y 100');

      http.expectOne((r) => r.url === base).flush(body, opts);

      expect(recibido).toBeInstanceOf(ApiError);
      expect((recibido as ApiError).message).toBe('El tamaño debe estar entre 1 y 100');
    });
  });

  describe('bloquear', () => {
    const fallo = (estado: number, nombre: string, mensaje: string, errores?: object) => {
      let recibido: unknown;
      repository.bloquear(9, 'Las fotos no corresponden').subscribe({
        error: (e: unknown) => (recibido = e),
      });
      const { body, opts } = error(estado, nombre, mensaje, errores);
      http.expectOne(`${base}/9/bloquear`).flush(body, opts);
      return recibido;
    };

    it('hace POST a /admin/publicaciones/{id}/bloquear con el motivo recortado y el token', () => {
      let motivoBloqueo: string | null | undefined;
      repository
        .bloquear(9, '  Las fotos no corresponden al alojamiento  ')
        .subscribe((p) => (motivoBloqueo = p.motivoBloqueo));

      const req = http.expectOne(`${base}/9/bloquear`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ motivo: 'Las fotos no corresponden al alojamiento' });
      expect(req.request.headers.get('Authorization')).toBe('Bearer adm');
      req.flush(dto('BLOQUEADA', 9, 'Las fotos no corresponden al alojamiento'));

      expect(motivoBloqueo).toBe('Las fotos no corresponden al alojamiento');
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
    });

    it('un 404 llega como PublicacionNoEncontradaError', () => {
      expect(fallo(404, 'Not Found', 'La publicación no existe')).toBeInstanceOf(
        PublicacionNoEncontradaError,
      );
    });

    it('un 409 llega como TransicionNoPermitidaError con el mensaje del backend', () => {
      const recibido = fallo(409, 'Conflict', 'La publicación ya está bloqueada');

      expect(recibido).toBeInstanceOf(TransicionNoPermitidaError);
      expect((recibido as Error).message).toBe('La publicación ya está bloqueada');
    });

    it('un error de red llega como ApiError', () => {
      let recibido: unknown;
      repository.bloquear(9, 'Las fotos no corresponden').subscribe({
        error: (e: unknown) => (recibido = e),
      });

      http.expectOne(`${base}/9/bloquear`).error(new ProgressEvent('error'));

      expect(recibido).toBeInstanceOf(ApiError);
    });
  });

  describe('reactivar', () => {
    const fallo = (estado: number, nombre: string, mensaje: string, errores?: object) => {
      let recibido: unknown;
      repository.reactivar(9, 'Se corrigió lo reportado').subscribe({
        error: (e: unknown) => (recibido = e),
      });
      const { body, opts } = error(estado, nombre, mensaje, errores);
      http.expectOne(`${base}/9/reactivar`).flush(body, opts);
      return recibido;
    };

    it('hace POST a /admin/publicaciones/{id}/reactivar con el motivo recortado y el token', () => {
      let resultado: { estado: string; motivoBloqueo: string | null } | undefined;
      repository
        .reactivar(9, '  Se corrigió lo reportado  ')
        .subscribe((p) => (resultado = { estado: p.estado, motivoBloqueo: p.motivoBloqueo }));

      const req = http.expectOne(`${base}/9/reactivar`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ motivo: 'Se corrigió lo reportado' });
      expect(req.request.headers.get('Authorization')).toBe('Bearer adm');
      req.flush(dto('ACTIVA', 9, null));

      expect(resultado).toEqual({ estado: 'ACTIVA', motivoBloqueo: null });
    });

    it('un 400 con errores.motivo llega como MotivoInvalidoError', () => {
      const recibido = fallo(400, 'Bad Request', 'Los datos enviados no son válidos', {
        motivo: 'El motivo debe tener entre 10 y 500 caracteres',
      });

      expect(recibido).toBeInstanceOf(MotivoInvalidoError);
      expect((recibido as Error).message).toBe('El motivo debe tener entre 10 y 500 caracteres');
    });

    it('un 400 por falta de información mínima llega como InformacionMinimaIncompletaError', () => {
      const recibido = fallo(
        400,
        'Bad Request',
        'La publicación no tiene la información mínima para activarse',
        {
          reglas: 'Las reglas son obligatorias para solicitar la activación',
          barrioZona: 'El barrio o zona es obligatorio para solicitar la activación',
          raro: 'ignorado',
        },
      );

      expect(recibido).toBeInstanceOf(InformacionMinimaIncompletaError);
      expect((recibido as InformacionMinimaIncompletaError).pendientes).toEqual({
        reglas: 'Las reglas son obligatorias para solicitar la activación',
        barrioZona: 'El barrio o zona es obligatorio para solicitar la activación',
      });
      expect((recibido as Error).message).toBe(
        'La publicación no tiene la información mínima para activarse',
      );
    });

    it('si vienen el motivo y campos pendientes a la vez, gana el error del motivo', () => {
      const recibido = fallo(400, 'Bad Request', 'No válido', {
        motivo: 'El motivo es obligatorio',
        reglas: 'Las reglas son obligatorias',
      });

      expect(recibido).toBeInstanceOf(MotivoInvalidoError);
    });

    it('un 400 sin campos conocidos llega como ApiError', () => {
      expect(fallo(400, 'Bad Request', 'Solicitud inválida')).toBeInstanceOf(ApiError);
      expect(fallo(400, 'Bad Request', 'Solicitud inválida', { raro: 'x' })).toBeInstanceOf(
        ApiError,
      );
    });

    it('un 404 llega como PublicacionNoEncontradaError', () => {
      expect(fallo(404, 'Not Found', 'La publicación no existe')).toBeInstanceOf(
        PublicacionNoEncontradaError,
      );
    });

    it('un 409 llega como TransicionNoPermitidaError con el mensaje del backend', () => {
      const recibido = fallo(
        409,
        'Conflict',
        'La publicación está en revisión: se aprueba, no se reactiva',
      );

      expect(recibido).toBeInstanceOf(TransicionNoPermitidaError);
      expect((recibido as Error).message).toBe(
        'La publicación está en revisión: se aprueba, no se reactiva',
      );
    });

    it('un 500 llega como ApiError', () => {
      expect(fallo(500, 'Internal Server Error', 'detalle interno')).toBeInstanceOf(ApiError);
    });
  });
});
