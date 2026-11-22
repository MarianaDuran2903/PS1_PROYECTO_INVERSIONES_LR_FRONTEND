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
  PublicacionNoEncontradaError,
  TransicionNoPermitidaError,
} from '../../domain/errors/publicacion.errors';
import { PublicacionResponseDto } from '../dtos/publicacion.dto';
import { PublicacionHttpRepository } from './publicacion-http.repository';

/** HU-014: pausar una publicación activa propia. */
describe('PublicacionHttpRepository: pausar', () => {
  const base = '/api-test';
  const url = `${base}/publicaciones/9/pausar`;
  const respuesta: PublicacionResponseDto = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'PAUSADA',
    titulo: 'Casa renovada',
    descripcion: 'Con terraza',
    direccionTextual: 'Carrera 7 # 8-9',
    barrioZona: 'Chapinero',
    ciudad: { id: 4, nombre: 'Cali' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 6,
    precioNoche: 300000.5,
    tarifaLimpieza: 0,
    reglas: 'No fumar',
  };
  const error = (estado: number, nombre: string, mensaje: string) => ({
    body: { fecha: '2026-01-01T00:00:00Z', estado, error: nombre, mensaje, ruta: '/x' },
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
      accessToken: 'abc',
      expiraEn: Date.now() + 3_600_000,
      usuario: {
        idUsuario: 3,
        primerNombre: 'Ana',
        primerApellido: 'Ruiz',
        correo: 'a@b.co',
        roles: ['ANFITRION'],
      },
    });
  });

  afterEach(() => {
    http.verify();
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  const fallo = (estado: number, nombre: string, mensaje: string) => {
    let recibido: unknown;
    repository.pausar(9).subscribe({ error: (e: unknown) => (recibido = e) });
    const { body, opts } = error(estado, nombre, mensaje);
    http.expectOne(url).flush(body, opts);
    return recibido;
  };

  it('hace POST a /publicaciones/{id}/pausar, sin cuerpo y con el token', () => {
    let estado: string | undefined;
    repository.pausar(9).subscribe((p) => (estado = p.estado));

    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush(respuesta);

    expect(estado).toBe('PAUSADA');
  });

  it('un 403 llega como PublicacionAjenaError y no muestra el aviso global de permisos', () => {
    const recibido = fallo(403, 'Forbidden', 'No tiene permisos');

    expect(recibido).toBeInstanceOf(PublicacionAjenaError);
    expect(toast.toasts().some((t) => t.title === 'Sin permisos')).toBeFalse();
  });

  it('un 404 llega como PublicacionNoEncontradaError', () => {
    expect(fallo(404, 'Not Found', 'La publicación no existe')).toBeInstanceOf(
      PublicacionNoEncontradaError,
    );
  });

  it('un 409 llega como TransicionNoPermitidaError con el mensaje del backend', () => {
    const recibido = fallo(409, 'Conflict', 'La publicación ya está pausada');

    expect(recibido).toBeInstanceOf(TransicionNoPermitidaError);
    expect((recibido as Error).message).toBe('La publicación ya está pausada');
  });

  it('un 500 llega como ApiError', () => {
    expect(fallo(500, 'Internal Server Error', 'detalle interno')).toBeInstanceOf(ApiError);
  });
});
