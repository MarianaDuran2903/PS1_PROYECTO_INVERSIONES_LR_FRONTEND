import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { environment } from '@env/environment';
import {
  CorreoYaRegistradoError,
  RegistroInvalidoError,
} from '../../domain/errors/registro.errors';
import {
  CredencialesInvalidasError,
  CuentaNoDisponibleError,
} from '../../domain/errors/login.errors';
import { RegistroUsuario } from '../../domain/models/registro-usuario';
import { Sesion } from '../../domain/models/sesion';
import { AuthHttpRepository } from './auth-http.repository';

describe('AuthHttpRepository', () => {
  const url = '/api-test/auth/registro';
  const datos: RegistroUsuario = {
    rol: 'ANFITRION',
    primerNombre: 'Ana',
    primerApellido: 'Ruiz',
    correo: 'Ana@Correo.com',
    contrasena: 'Segura#2026',
  };

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

  it('envía el DTO normalizado y mapea la respuesta 201', () => {
    let idUsuario: number | undefined;
    repository.registrarUsuario(datos).subscribe((usuario) => (idUsuario = usuario.idUsuario));

    const req = http.expectOne(url);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.rol).toBe('ANFITRION');
    expect(req.request.body.correo).toBe('ana@correo.com');
    expect(req.request.body.segundoNombre).toBeNull();
    req.flush(
      {
        idUsuario: 15,
        primerNombre: 'Ana',
        segundoNombre: null,
        primerApellido: 'Ruiz',
        segundoApellido: null,
        correo: 'ana@correo.com',
        roles: ['HUESPED'],
      },
      { status: 201, statusText: 'Created' },
    );

    expect(idUsuario).toBe(15);
  });

  it('convierte 409 en CorreoYaRegistradoError', () => {
    let error: unknown;
    repository.registrarUsuario(datos).subscribe({ error: (e: unknown) => (error = e) });

    http
      .expectOne(url)
      .flush(
        { code: 'EMAIL_ALREADY_REGISTERED', message: 'Duplicado' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(error).toBeInstanceOf(CorreoYaRegistradoError);
    expect((error as CorreoYaRegistradoError).correo).toBe('ana@correo.com');
  });

  it('convierte 400 con errores de campo en RegistroInvalidoError', () => {
    let error: unknown;
    repository.registrarUsuario(datos).subscribe({ error: (e: unknown) => (error = e) });

    http.expectOne(url).flush(
      {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        errors: [
          { field: 'contrasena', message: 'Contraseña débil' },
          { field: 'campoDesconocido', message: 'Ignorar' },
        ],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(error).toBeInstanceOf(RegistroInvalidoError);
    expect((error as RegistroInvalidoError).errores).toEqual({ contrasena: 'Contraseña débil' });
  });

  describe('iniciarSesion', () => {
    const urlLogin = '/api-test/auth/login';
    const credenciales = { correo: ' Ana@Correo.com ', contrasena: 'Segura#2026' };
    const iniciar = () => {
      const resultado: { sesion?: Sesion; error?: unknown } = {};
      repository.iniciarSesion(credenciales).subscribe({
        next: (s) => (resultado.sesion = s),
        error: (e: unknown) => (resultado.error = e),
      });
      return resultado;
    };

    it('envía el correo normalizado y mapea la sesión', () => {
      const resultado = iniciar();

      const req = http.expectOne(urlLogin);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ correo: 'ana@correo.com', contrasena: 'Segura#2026' });
      req.flush({
        accessToken: 'jwt-abc',
        usuario: {
          idUsuario: 9,
          primerNombre: 'Ana',
          segundoNombre: null,
          primerApellido: 'Ruiz',
          segundoApellido: null,
          correo: 'ana@correo.com',
          roles: ['HUESPED', 'ANFITRION', 'DESCONOCIDO'],
        },
      });

      expect(resultado.sesion?.accessToken).toBe('jwt-abc');
      expect(resultado.sesion?.usuario.roles).toEqual(['HUESPED', 'ANFITRION']);
    });

    it('convierte 401 en CredencialesInvalidasError', () => {
      const resultado = iniciar();

      http
        .expectOne(urlLogin)
        .flush(
          { code: 'BAD_CREDENTIALS', message: 'x' },
          { status: 401, statusText: 'Unauthorized' },
        );

      expect(resultado.error).toBeInstanceOf(CredencialesInvalidasError);
    });

    it('convierte 403 con código de cuenta en CuentaNoDisponibleError', () => {
      const resultado = iniciar();

      http
        .expectOne(urlLogin)
        .flush(
          { code: 'ACCOUNT_RESTRICTED', message: 'x' },
          { status: 403, statusText: 'Forbidden' },
        );

      expect(resultado.error).toBeInstanceOf(CuentaNoDisponibleError);
      expect((resultado.error as CuentaNoDisponibleError).motivo).toBe('RESTRINGIDA');
    });

    it('deja pasar otros errores como ApiError', () => {
      const resultado = iniciar();

      http.expectOne(urlLogin).flush({}, { status: 500, statusText: 'Server Error' });

      expect(resultado.error).toBeInstanceOf(ApiError);
    });
  });
});
