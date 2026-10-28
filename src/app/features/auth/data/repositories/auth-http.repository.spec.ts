import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { environment } from '@env/environment';
import { CredencialesInvalidasError } from '../../domain/errors/login.errors';
import {
  CorreoYaRegistradoError,
  RegistroInvalidoError,
} from '../../domain/errors/registro.errors';
import { RegistroUsuario } from '../../domain/models/registro-usuario';
import { UsuarioResponseDto } from '../dtos/registro-usuario.dto';
import { AuthHttpRepository } from './auth-http.repository';

describe('AuthHttpRepository', () => {
  const base = '/api-test/auth';
  const datos: RegistroUsuario = {
    rol: 'ANFITRION',
    primerNombre: ' Ana ',
    primerApellido: 'Ruiz',
    correo: 'ana@correo.com',
    contrasena: 'Segura#2026',
    confirmarContrasena: 'Segura#2026',
  };
  const usuario: UsuarioResponseDto = {
    idUsuario: 7,
    primerNombre: 'Ana',
    segundoNombre: null,
    primerApellido: 'Ruiz',
    segundoApellido: null,
    correo: 'ana@correo.com',
    rol: 'ANFITRION',
    cuentaActiva: true,
  };
  const error = (estado: number, nombre: string, mensaje: string, errores?: object) => ({
    body: { fecha: '2026-01-01T00:00:00Z', estado, error: nombre, mensaje, ruta: '/x', errores },
    opts: { status: estado, statusText: nombre },
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

  describe('registrarUsuario', () => {
    it('Anfitrión llama a /auth/registro/anfitrion con el cuerpo sin rol', () => {
      let idUsuario: number | undefined;
      repository.registrarUsuario(datos).subscribe((u) => (idUsuario = u.idUsuario));

      const req = http.expectOne(`${base}/registro/anfitrion`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        primerNombre: 'Ana',
        segundoNombre: null,
        primerApellido: 'Ruiz',
        segundoApellido: null,
        correo: 'ana@correo.com',
        contrasena: 'Segura#2026',
        confirmarContrasena: 'Segura#2026',
      });
      req.flush(usuario);

      expect(idUsuario).toBe(7);
    });

    it('Huésped llama a /auth/registro/huesped', () => {
      repository.registrarUsuario({ ...datos, rol: 'HUESPED' }).subscribe();

      const req = http.expectOne(`${base}/registro/huesped`);
      expect(req.request.method).toBe('POST');
      req.flush({ ...usuario, rol: 'HUESPED' });
    });

    it('409 se convierte en CorreoYaRegistradoError con el mensaje del backend', () => {
      let fallo: unknown;
      repository.registrarUsuario(datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(409, 'Conflict', 'El correo ya está registrado');

      http.expectOne(`${base}/registro/anfitrion`).flush(body, opts);

      expect(fallo).toBeInstanceOf(CorreoYaRegistradoError);
      expect((fallo as Error).message).toBe('El correo ya está registrado');
    });

    it('400 con errores se convierte en RegistroInvalidoError por campo', () => {
      let fallo: unknown;
      repository.registrarUsuario(datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(400, 'Bad Request', 'Datos inválidos', {
        primerNombre: 'Solo se permiten letras, espacios, guion o apóstrofe',
        confirmarContrasena: 'La confirmación no coincide con la contraseña',
        campoDesconocido: 'ignorado',
      });

      http.expectOne(`${base}/registro/anfitrion`).flush(body, opts);

      expect(fallo).toBeInstanceOf(RegistroInvalidoError);
      expect((fallo as RegistroInvalidoError).errores).toEqual({
        primerNombre: 'Solo se permiten letras, espacios, guion o apóstrofe',
        confirmarContrasena: 'La confirmación no coincide con la contraseña',
      });
    });

    it('400 sin errores (JSON mal formado) llega como ApiError con el mensaje', () => {
      let fallo: unknown;
      repository.registrarUsuario(datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(400, 'Bad Request', 'El cuerpo de la petición no es válido');

      http.expectOne(`${base}/registro/anfitrion`).flush(body, opts);

      expect(fallo).toBeInstanceOf(ApiError);
      expect((fallo as ApiError).message).toBe('El cuerpo de la petición no es válido');
    });

    it('un 500 llega con mensaje genérico, sin detalles técnicos', () => {
      let fallo: unknown;
      repository.registrarUsuario(datos).subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(500, 'Internal Server Error', 'SQLException: tabla usuario');

      http.expectOne(`${base}/registro/anfitrion`).flush(body, opts);

      expect(fallo).toBeInstanceOf(ApiError);
      expect((fallo as ApiError).message).not.toContain('SQL');
    });
  });

  describe('iniciarSesion', () => {
    it('envía correo y contraseña, y calcula el vencimiento de la sesión', () => {
      const antes = Date.now();
      let expiraEn = 0;
      let token = '';
      repository
        .iniciarSesion({ correo: ' ana@correo.com ', contrasena: 'Segura#2026' })
        .subscribe((s) => {
          expiraEn = s.expiraEn;
          token = s.accessToken;
        });

      const req = http.expectOne(`${base}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ correo: 'ana@correo.com', contrasena: 'Segura#2026' });
      req.flush({ token: 'jwt', tipo: 'Bearer', expiraEn: 3600, usuario });

      expect(token).toBe('jwt');
      expect(expiraEn).toBeGreaterThanOrEqual(antes + 3_600_000);
    });

    it('401 se convierte en CredencialesInvalidasError con el mensaje genérico del backend', () => {
      let fallo: unknown;
      repository
        .iniciarSesion({ correo: 'ana@correo.com', contrasena: 'mala' })
        .subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(401, 'Unauthorized', 'Correo o contraseña incorrectos');

      http.expectOne(`${base}/login`).flush(body, opts);

      expect(fallo).toBeInstanceOf(CredencialesInvalidasError);
      expect((fallo as Error).message).toBe('Correo o contraseña incorrectos');
    });

    it('un 403 no revela el estado de la cuenta: llega como ApiError', () => {
      let fallo: unknown;
      repository
        .iniciarSesion({ correo: 'ana@correo.com', contrasena: 'x' })
        .subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(403, 'Forbidden', 'No tiene permisos para esta operación');

      http.expectOne(`${base}/login`).flush(body, opts);

      expect(fallo).toBeInstanceOf(ApiError);
      expect(fallo).not.toBeInstanceOf(CredencialesInvalidasError);
    });
  });

  describe('obtenerSesion', () => {
    it('hace GET /auth/sesion e interpreta el vencimiento ISO', () => {
      let resultado: { rol: string; expiraEn: number } | undefined;
      repository.obtenerSesion().subscribe((s) => {
        resultado = { rol: s.usuario.roles[0], expiraEn: s.expiraEn };
      });

      const req = http.expectOne(`${base}/sesion`);
      expect(req.request.method).toBe('GET');
      req.flush({ usuario, expiraEn: '2026-05-01T10:00:00Z' });

      expect(resultado).toEqual({ rol: 'ANFITRION', expiraEn: Date.parse('2026-05-01T10:00:00Z') });
    });

    it('401 llega como ApiError para que se limpie la sesión', () => {
      let fallo: unknown;
      repository.obtenerSesion().subscribe({ error: (e: unknown) => (fallo = e) });
      const { body, opts } = error(401, 'Unauthorized', 'Token inválido');

      http.expectOne(`${base}/sesion`).flush(body, opts);

      expect((fallo as ApiError).status).toBe(401);
    });
  });
});
