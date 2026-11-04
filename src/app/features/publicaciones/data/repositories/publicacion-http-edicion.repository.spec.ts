import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { ToastService } from '@core/notifications/toast.service';
import { environment } from '@env/environment';
import { authTokenInterceptor } from '@features/auth/application/interceptors/auth-token.interceptor';
import { SESSION_STORAGE_KEY, SessionService } from '@features/auth/application/session.service';
import {
  PublicacionAjenaError,
  PublicacionInvalidaError,
  PublicacionNoEditableError,
  PublicacionNoEncontradaError,
} from '../../domain/errors/publicacion.errors';
import { ActualizarPublicacion } from '../../domain/models/publicacion';
import { PublicacionResponseDto } from '../dtos/publicacion.dto';
import { PublicacionHttpRepository } from './publicacion-http.repository';

describe('PublicacionHttpRepository: obtener y actualizar', () => {
  const base = '/api-test';
  const datos: ActualizarPublicacion = {
    titulo: '  Casa renovada ',
    descripcion: 'Con terraza',
    direccionTextual: 'Carrera 7 # 8-9',
    idCiudad: 4,
    barrioZona: '',
    idTipo: 2,
    capacidad: 6,
    precioNoche: 300000.5,
    tarifaLimpieza: 0,
    reglas: '  ',
  };
  const respuesta: PublicacionResponseDto = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'PAUSADA',
    titulo: 'Casa renovada',
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

  let repository: PublicacionHttpRepository;
  let http: HttpTestingController;
  let session: SessionService;
  let toast: ToastService;

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
    toast = TestBed.inject(ToastService);
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

  describe('obtener', () => {
    it('hace GET /publicaciones/{id} con el token y mapea la respuesta', () => {
      let estado = '';
      let reglas: string | null | undefined;
      repository.obtener(9).subscribe((p) => {
        estado = p.estado;
        reglas = p.reglas;
      });

      const req = http.expectOne(`${base}/publicaciones/9`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-anfitrion');
      req.flush({ ...respuesta, reglas: 'No fumar' });

      expect(estado).toBe('PAUSADA');
      expect(reglas).toBe('No fumar');
    });

    it('si el backend no manda `reglas`, quedan en null', () => {
      let reglas: string | null | undefined;
      const sinReglas: Partial<PublicacionResponseDto> = { ...respuesta };
      delete sinReglas.reglas;
      repository.obtener(9).subscribe((p) => (reglas = p.reglas));

      http.expectOne(`${base}/publicaciones/9`).flush(sinReglas);

      expect(reglas).toBeNull();
    });

    it('403 se convierte en PublicacionAjenaError y no muestra el aviso global', () => {
      let fallo: unknown;
      repository.obtener(9).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(403, 'Forbidden', 'No tiene permisos para esta operación');

      http.expectOne(`${base}/publicaciones/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(PublicacionAjenaError);
      expect(toast.toasts().length).toBe(0);
      expect(session.autenticado()).toBeTrue();
    });

    it('404 se convierte en PublicacionNoEncontradaError', () => {
      let fallo: unknown;
      repository.obtener(9).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(404, 'Not Found', 'La publicación no existe');

      http.expectOne(`${base}/publicaciones/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(PublicacionNoEncontradaError);
    });

    it('401 cierra la sesión y llega como ApiError', () => {
      let fallo: unknown;
      repository.obtener(9).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(401, 'Unauthorized', 'Token inválido');

      http.expectOne(`${base}/publicaciones/9`).flush(body, opts);

      expect((fallo as ApiError).status).toBe(401);
      expect(session.autenticado()).toBeFalse();
    });
  });

  describe('actualizar', () => {
    it('hace PUT /publicaciones/{id} con el token y todos los campos como números', () => {
      let titulo = '';
      repository.actualizar(9, datos).subscribe((p) => (titulo = p.titulo));

      const req = http.expectOne(`${base}/publicaciones/9`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-anfitrion');
      expect(req.request.body).toEqual({
        titulo: 'Casa renovada',
        descripcion: 'Con terraza',
        direccionTextual: 'Carrera 7 # 8-9',
        idCiudad: 4,
        barrioZona: null,
        idTipo: 2,
        capacidad: 6,
        precioNoche: 300000.5,
        tarifaLimpieza: 0,
        reglas: null,
      });
      expect(typeof req.request.body.capacidad).toBe('number');
      expect(typeof req.request.body.precioNoche).toBe('number');
      expect(typeof req.request.body.tarifaLimpieza).toBe('number');
      req.flush(respuesta);

      expect(titulo).toBe('Casa renovada');
    });

    it('no envía idAnfitrion, estado ni politica', () => {
      repository.actualizar(9, datos).subscribe();

      const req = http.expectOne(`${base}/publicaciones/9`);
      for (const campo of ['idAnfitrion', 'estado', 'politica']) {
        expect(campo in req.request.body).toBeFalse();
      }
      req.flush(respuesta);
    });

    it('envía las reglas con texto recortado', () => {
      repository.actualizar(9, { ...datos, reglas: '  No fumar  ' }).subscribe();

      const req = http.expectOne(`${base}/publicaciones/9`);
      expect(req.request.body.reglas).toBe('No fumar');
      req.flush(respuesta);
    });

    it('400 con errores se convierte en PublicacionInvalidaError por campo', () => {
      let fallo: unknown;
      repository.actualizar(9, datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(400, 'Bad Request', 'Los datos enviados no son válidos', {
        capacidad: 'La capacidad debe ser un número entero mayor que 0',
        tarifaLimpieza: 'La tarifa de limpieza no puede ser negativa',
        otroCampo: 'ignorado',
      });

      http.expectOne(`${base}/publicaciones/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(PublicacionInvalidaError);
      expect((fallo as PublicacionInvalidaError).errores).toEqual({
        capacidad: 'La capacidad debe ser un número entero mayor que 0',
        tarifaLimpieza: 'La tarifa de limpieza no puede ser negativa',
      });
    });

    it('400 sin errores llega como ApiError con el mensaje', () => {
      let fallo: unknown;
      repository.actualizar(9, datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(400, 'Bad Request', 'El cuerpo de la petición no es válido');

      http.expectOne(`${base}/publicaciones/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(ApiError);
      expect((fallo as ApiError).message).toBe('El cuerpo de la petición no es válido');
    });

    it('409 se convierte en PublicacionNoEditableError con el mensaje del backend', () => {
      let fallo: unknown;
      repository.actualizar(9, datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(
        409,
        'Conflict',
        'La publicación está activa: solicite pausarla para editarla',
      );

      http.expectOne(`${base}/publicaciones/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(PublicacionNoEditableError);
      expect((fallo as Error).message).toBe(
        'La publicación está activa: solicite pausarla para editarla',
      );
    });

    it('403 y 404 se convierten en errores de dominio sin aviso global', () => {
      const fallos: unknown[] = [];
      repository.actualizar(9, datos).subscribe({ error: (e: unknown) => fallos.push(e) });
      repository.actualizar(9, datos).subscribe({ error: (e: unknown) => fallos.push(e) });
      const [primera, segunda] = http.match(`${base}/publicaciones/9`);

      const prohibido = error(403, 'Forbidden', 'No tiene permisos para esta operación');
      primera.flush(prohibido.body, prohibido.opts);
      const noExiste = error(404, 'Not Found', 'No existe');
      segunda.flush(noExiste.body, noExiste.opts);

      expect(fallos[0]).toBeInstanceOf(PublicacionAjenaError);
      expect(fallos[1]).toBeInstanceOf(PublicacionNoEncontradaError);
      expect(toast.toasts().length).toBe(0);
    });

    it('un 500 llega como ApiError con mensaje genérico', () => {
      let fallo: unknown;
      repository.actualizar(9, datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(500, 'Internal Server Error', 'SQLException: tabla');

      http.expectOne(`${base}/publicaciones/9`).flush(body, opts);

      expect(fallo).toBeInstanceOf(ApiError);
      expect((fallo as ApiError).message).not.toContain('SQL');
    });
  });
});
