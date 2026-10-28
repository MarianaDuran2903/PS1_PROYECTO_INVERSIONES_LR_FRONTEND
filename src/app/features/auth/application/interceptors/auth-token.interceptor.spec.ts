import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { APP_CONFIG } from '@core/config/app-config';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import { ToastService } from '@core/notifications/toast.service';
import { environment } from '@env/environment';
import { SESSION_STORAGE_KEY, SessionService } from '../session.service';
import { authTokenInterceptor } from './auth-token.interceptor';

describe('authTokenInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let session: SessionService;
  let router: Router;
  let toast: ToastService;

  const errorDelBackend = (estado: number, error: string, mensaje: string) => ({
    body: { fecha: '2026-01-01T00:00:00Z', estado, error, mensaje, ruta: '/api-test/x' },
    opts: { status: estado, statusText: error },
  });

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
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
    toast = TestBed.inject(ToastService);
    spyOn(router, 'navigate').and.resolveTo(true);
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
  });

  afterEach(() => {
    controller.verify();
    session.cerrar();
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  });

  it('agrega el token a las peticiones a nuestro API', () => {
    http.get('/api-test/reservas').subscribe();

    const req = controller.expectOne('/api-test/reservas');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush([]);
  });

  it('no envía el token a otros hosts', () => {
    http.get('https://otro-sitio.com/datos').subscribe();

    const req = controller.expectOne('https://otro-sitio.com/datos');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  for (const ruta of ['/api-test/auth/login', '/api-test/auth/registro/huesped']) {
    it(`no envía el token a ${ruta}`, () => {
      http.post(ruta, {}).subscribe();

      const req = controller.expectOne(ruta);
      expect(req.request.headers.has('Authorization')).toBeFalse();
      req.flush({});
    });
  }

  it('un 401 en una ruta protegida cierra la sesión y lleva a /login?expirada=true', () => {
    http.get('/api-test/reservas').subscribe({ error: () => undefined });
    const { body, opts } = errorDelBackend(401, 'Unauthorized', 'Token inválido');

    controller.expectOne('/api-test/reservas').flush(body, opts);

    expect(session.autenticado()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { expirada: 'true' },
    });
  });

  it('el 401 del propio login (credenciales malas) no toca la sesión', () => {
    http.post('/api-test/auth/login', {}).subscribe({ error: () => undefined });
    const { body, opts } = errorDelBackend(401, 'Unauthorized', 'Correo o contraseña incorrectos');

    controller.expectOne('/api-test/auth/login').flush(body, opts);

    expect(session.autenticado()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('un 403 avisa que no tiene permisos y NO cierra la sesión', () => {
    http.get('/api-test/admin/usuarios').subscribe({ error: () => undefined });
    const { body, opts } = errorDelBackend(
      403,
      'Forbidden',
      'No tiene permisos para esta operación',
    );

    controller.expectOne('/api-test/admin/usuarios').flush(body, opts);

    expect(session.autenticado()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(
      toast
        .toasts()
        .some(
          (t) =>
            t.title === 'Sin permisos' && t.message === 'No tiene permisos para esta operación',
        ),
    ).toBeTrue();
  });

  it('deja pasar el error a quien hizo la petición', () => {
    let recibido: unknown;
    http.get('/api-test/reservas').subscribe({ error: (e: unknown) => (recibido = e) });
    const { body, opts } = errorDelBackend(
      500,
      'Internal Server Error',
      'NullPointerException en X',
    );

    controller.expectOne('/api-test/reservas').flush(body, opts);

    expect(recibido).toEqual(jasmine.objectContaining({ status: 500 }));
  });
});
