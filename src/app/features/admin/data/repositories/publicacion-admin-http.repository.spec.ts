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
import { PublicacionResponseDto } from '@features/publicaciones/data/dtos/publicacion.dto';
import {
  PublicacionNoEditableError,
  PublicacionNoEncontradaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import { IntervencionPublicacion } from '@features/publicaciones/domain/models/publicacion';
import { IntervencionInvalidaError } from '../../domain/errors/intervencion.errors';
import { PublicacionAdminHttpRepository } from './publicacion-admin-http.repository';

describe('PublicacionAdminHttpRepository', () => {
  const base = '/api-test/admin/publicaciones';
  const intervencion: IntervencionPublicacion = {
    motivo: '  Corrección de la dirección reportada  ',
    cambios: {
      titulo: '  Casa corregida ',
      descripcion: 'Con terraza',
      direccionTextual: 'Carrera 7 # 8-9',
      idCiudad: 4,
      barrioZona: '',
      idTipo: 2,
      capacidad: 6,
      precioNoche: 300000.5,
      tarifaLimpieza: 0,
      reglas: '  ',
    },
  };
  const respuesta: PublicacionResponseDto = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'BLOQUEADA',
    titulo: 'Casa corregida',
    descripcion: 'Con terraza',
    direccionTextual: 'Carrera 7 # 8-9',
    barrioZona: null,
    ciudad: { id: 4, nombre: 'Cali' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 6,
    precioNoche: 300000.5,
    tarifaLimpieza: 0,
    reglas: null,
  };
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
      accessToken: 'jwt-admin',
      expiraEn: Date.now() + 3_600_000,
      usuario: {
        idUsuario: 1,
        primerNombre: 'Ada',
        primerApellido: 'Admin',
        correo: 'ada@correo.com',
        roles: ['ADMINISTRADOR'],
      },
    });
  });

  afterEach(() => {
    http.verify();
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  describe('obtener', () => {
    it('hace GET /admin/publicaciones/{id} con el token y mapea la respuesta', () => {
      let estado = '';
      let idAnfitrion = 0;
      repository.obtener(9).subscribe((p) => {
        estado = p.estado;
        idAnfitrion = p.idAnfitrion;
      });

      const req = http.expectOne(`${base}/9`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-admin');
      req.flush(respuesta);

      expect(estado).toBe('BLOQUEADA');
      expect(idAnfitrion).toBe(3);
    });

    it('404 se convierte en PublicacionNoEncontradaError', () => {
      let fallo: unknown;
      repository.obtener(9).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(404, 'Not Found', 'La publicación no existe');

      http.expectOne(`${base}/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(PublicacionNoEncontradaError);
    });

    it('403 (sin rol Administrador) llega como ApiError', () => {
      let fallo: unknown;
      repository.obtener(9).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(403, 'Forbidden', 'No tiene permisos para esta operación');

      http.expectOne(`${base}/9`).flush(body, opts);

      expect((fallo as ApiError).status).toBe(403);
    });

    it('401 cierra la sesión y llega como ApiError', () => {
      let fallo: unknown;
      repository.obtener(9).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(401, 'Unauthorized', 'Debe iniciar sesión');

      http.expectOne(`${base}/9`).flush(body, opts);

      expect((fallo as ApiError).status).toBe(401);
      expect(session.autenticado()).toBeFalse();
    });
  });

  describe('intervenir', () => {
    it('hace PUT /admin/publicaciones/{id} con el token y el cuerpo { motivo, cambios }', () => {
      let titulo = '';
      repository.intervenir(9, intervencion).subscribe((p) => (titulo = p.titulo));

      const req = http.expectOne(`${base}/9`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-admin');
      expect(req.request.body).toEqual({
        motivo: 'Corrección de la dirección reportada',
        cambios: {
          titulo: 'Casa corregida',
          descripcion: 'Con terraza',
          direccionTextual: 'Carrera 7 # 8-9',
          idCiudad: 4,
          barrioZona: null,
          idTipo: 2,
          capacidad: 6,
          precioNoche: 300000.5,
          tarifaLimpieza: 0,
          reglas: null,
        },
      });
      req.flush(respuesta);

      expect(titulo).toBe('Casa corregida');
    });

    it('envía los números como número y no incluye estado, idAnfitrion ni politica', () => {
      repository.intervenir(9, intervencion).subscribe();

      const req = http.expectOne(`${base}/9`);
      const cambios = req.request.body.cambios;
      expect(typeof cambios.capacidad).toBe('number');
      expect(typeof cambios.precioNoche).toBe('number');
      expect(typeof cambios.tarifaLimpieza).toBe('number');
      for (const campo of ['idAnfitrion', 'estado', 'politica']) {
        expect(campo in cambios).toBeFalse();
        expect(campo in req.request.body).toBeFalse();
      }
      req.flush(respuesta);
    });

    it('400: quita el prefijo "cambios." y deja el error del motivo en `motivo`', () => {
      let fallo: unknown;
      repository.intervenir(9, intervencion).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(400, 'Bad Request', 'Los datos enviados no son válidos', {
        motivo: 'El motivo debe tener entre 10 y 500 caracteres',
        'cambios.capacidad': 'La capacidad debe ser un número entero mayor que 0',
        'cambios.idCiudad': 'La ciudad no existe',
        'cambios.reglas': 'Las reglas son obligatorias para una publicación en revisión',
        'cambios.otroCampo': 'ignorado',
      });

      http.expectOne(`${base}/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(IntervencionInvalidaError);
      expect((fallo as IntervencionInvalidaError).errores).toEqual({
        motivo: 'El motivo debe tener entre 10 y 500 caracteres',
        capacidad: 'La capacidad debe ser un número entero mayor que 0',
        idCiudad: 'La ciudad no existe',
        reglas: 'Las reglas son obligatorias para una publicación en revisión',
      });
    });

    it('400 sin errores llega como ApiError con el mensaje', () => {
      let fallo: unknown;
      repository.intervenir(9, intervencion).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(400, 'Bad Request', 'El cuerpo de la petición no es válido');

      http.expectOne(`${base}/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(ApiError);
      expect((fallo as ApiError).message).toBe('El cuerpo de la petición no es válido');
    });

    it('409 (ACTIVA) se convierte en PublicacionNoEditableError con el mensaje del backend', () => {
      let fallo: unknown;
      repository.intervenir(9, intervencion).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(
        409,
        'Conflict',
        'La publicación está activa: páusela antes de intervenirla',
      );

      http.expectOne(`${base}/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(PublicacionNoEditableError);
      expect((fallo as Error).message).toBe(
        'La publicación está activa: páusela antes de intervenirla',
      );
    });

    it('404 se convierte en PublicacionNoEncontradaError', () => {
      let fallo: unknown;
      repository.intervenir(9, intervencion).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(404, 'Not Found', 'La publicación no existe');

      http.expectOne(`${base}/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(PublicacionNoEncontradaError);
    });

    it('403 (sin rol Administrador) llega como ApiError y no cierra la sesión', () => {
      let fallo: unknown;
      repository.intervenir(9, intervencion).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(403, 'Forbidden', 'No tiene permisos para esta operación');

      http.expectOne(`${base}/9`).flush(body, opts);

      expect((fallo as ApiError).status).toBe(403);
      expect(session.autenticado()).toBeTrue();
    });

    it('un 500 llega como ApiError con mensaje genérico', () => {
      let fallo: unknown;
      repository.intervenir(9, intervencion).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(500, 'Internal Server Error', 'SQLException: tabla');

      http.expectOne(`${base}/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(ApiError);
      expect((fallo as ApiError).message).not.toContain('SQL');
    });
  });
});
