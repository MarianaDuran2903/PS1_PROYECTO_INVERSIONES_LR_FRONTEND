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

  it('un 401 con sesión abierta la cierra, avisa y lleva al login', () => {
    http.get('/api-test/reservas').subscribe({ error: () => undefined });

    controller
      .expectOne('/api-test/reservas')
      .flush(
        { code: 'TOKEN_EXPIRED', message: 'Expiró' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(session.autenticado()).toBeFalse();
    expect(toast.toasts().some((t) => t.title === 'Tu sesión expiró')).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/' },
    });
  });

  it('el 401 del propio login (credenciales malas) no toca la sesión', () => {
    http.post('/api-test/auth/login', {}).subscribe({ error: () => undefined });

    controller
      .expectOne('/api-test/auth/login')
      .flush(
        { code: 'BAD_CREDENTIALS', message: 'Mal' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(session.autenticado()).toBeTrue();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
