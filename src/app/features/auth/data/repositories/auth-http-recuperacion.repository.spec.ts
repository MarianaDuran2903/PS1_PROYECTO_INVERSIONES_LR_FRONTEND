import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { environment } from '@env/environment';
import {
  EnlaceRecuperacionInvalidoError,
  RestablecimientoInvalidoError,
  SolicitudRecuperacionInvalidaError,
} from '../../domain/errors/recuperacion.errors';
import { RestablecerContrasena } from '../../domain/models/recuperacion';
import { AuthHttpRepository } from './auth-http.repository';

/** HU-004: recuperación de contraseña simulada, contra el contrato real del backend. */
describe('AuthHttpRepository (recuperación de contraseña)', () => {
  const base = '/api-test/auth/recuperacion';
  const datos: RestablecerContrasena = {
    token: ' q3Jx9Vf0 ',
    contrasena: 'Nueva#456',
    confirmarContrasena: 'Nueva#456',
  };
  const error = (estado: number, mensaje: string, errores?: object) => ({
    body: {
      fecha: '2026-11-12T15:00:00Z',
      estado,
      error: 'Bad Request',
      mensaje,
      ruta: '/x',
      errores,
    },
    opts: { status: estado, statusText: 'Bad Request' },
  });

  let repository: AuthHttpRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        {
          provide: APP_CONFIG,
          useValue: { ...environment, apiUrl: '/api-test', logLevel: 'error' },
        },
        AuthHttpRepository,
      ],
    });
    repository = TestBed.inject(AuthHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('solicitarRecuperacion', () => {
    it('hace POST a /auth/recuperacion/solicitud con solo el correo recortado', () => {
      let mensaje: string | undefined;
      repository
        .solicitarRecuperacion('  carlos.gomez@correo.com ')
        .subscribe((m) => (mensaje = m));

      const req = http.expectOne(`${base}/solicitud`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ correo: 'carlos.gomez@correo.com' });
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush(
        { mensaje: 'Si el correo está registrado, recibirás las instrucciones' },
        { status: 202, statusText: 'Accepted' },
      );

      expect(mensaje).toBe('Si el correo está registrado, recibirás las instrucciones');
    });

    it('un 400 con errores.correo llega como SolicitudRecuperacionInvalidaError', () => {
      let recibido: unknown;
      repository.solicitarRecuperacion('x').subscribe({ error: (e: unknown) => (recibido = e) });
      const { body, opts } = error(400, 'Los datos enviados no son válidos', {
        correo: 'Ingrese un correo válido',
      });

      http.expectOne(`${base}/solicitud`).flush(body, opts);

      expect(recibido).toBeInstanceOf(SolicitudRecuperacionInvalidaError);
      expect((recibido as SolicitudRecuperacionInvalidaError).errores).toEqual({
        correo: 'Ingrese un correo válido',
      });
    });

    it('un 500 llega como ApiError', () => {
      let recibido: unknown;
      repository
        .solicitarRecuperacion('a@b.co')
        .subscribe({ error: (e: unknown) => (recibido = e) });
      const { body, opts } = error(500, 'Fallo interno');

      http.expectOne(`${base}/solicitud`).flush(body, { ...opts, status: 500 });

      expect(recibido).toBeInstanceOf(ApiError);
    });
  });

  describe('restablecerContrasena', () => {
    it('hace POST a /auth/recuperacion/restablecer con el cuerpo exacto y sin Authorization', () => {
      let mensaje: string | undefined;
      repository.restablecerContrasena(datos).subscribe((m) => (mensaje = m));

      const req = http.expectOne(`${base}/restablecer`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        token: 'q3Jx9Vf0',
        contrasena: 'Nueva#456',
        confirmarContrasena: 'Nueva#456',
      });
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({ mensaje: 'Tu contraseña se actualizó' });

      expect(mensaje).toBe('Tu contraseña se actualizó');
    });

    it('un 400 con errores llega como RestablecimientoInvalidoError por campo', () => {
      let recibido: unknown;
      repository.restablecerContrasena(datos).subscribe({ error: (e: unknown) => (recibido = e) });
      const { body, opts } = error(400, 'Los datos enviados no son válidos', {
        confirmarContrasena: 'La confirmación no coincide con la contraseña',
        otroCampo: 'ignorado',
      });

      http.expectOne(`${base}/restablecer`).flush(body, opts);

      expect(recibido).toBeInstanceOf(RestablecimientoInvalidoError);
      expect((recibido as RestablecimientoInvalidoError).errores).toEqual({
        confirmarContrasena: 'La confirmación no coincide con la contraseña',
      });
    });

    it('un 400 sin errores (token inválido, vencido o usado) llega como EnlaceRecuperacionInvalidoError', () => {
      let recibido: unknown;
      repository.restablecerContrasena(datos).subscribe({ error: (e: unknown) => (recibido = e) });
      const { body, opts } = error(400, 'El enlace de recuperación no es válido o ha expirado');

      http.expectOne(`${base}/restablecer`).flush(body, opts);

      expect(recibido).toBeInstanceOf(EnlaceRecuperacionInvalidoError);
      expect((recibido as Error).message).toBe(
        'El enlace de recuperación no es válido o ha expirado',
      );
    });

    it('un 400 con campos desconocidos y nada más llega como ApiError', () => {
      let recibido: unknown;
      repository.restablecerContrasena(datos).subscribe({ error: (e: unknown) => (recibido = e) });
      const { body, opts } = error(400, 'Datos no válidos', { raro: 'x' });

      http.expectOne(`${base}/restablecer`).flush(body, opts);

      expect(recibido).toBeInstanceOf(ApiError);
    });

    it('un error de red llega como ApiError', () => {
      let recibido: unknown;
      repository.restablecerContrasena(datos).subscribe({ error: (e: unknown) => (recibido = e) });

      http.expectOne(`${base}/restablecer`).error(new ProgressEvent('error'));

      expect(recibido).toBeInstanceOf(ApiError);
      expect((recibido as ApiError).status).toBe(0);
    });
  });
});
