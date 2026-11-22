import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CORRELATION_ID_HEADER } from '@core/http/api-error';
import { correlationIdInterceptor } from './correlation-id.interceptor';

describe('correlationIdInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([correlationIdInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  it('agrega un identificador a las peticiones del mismo origen', () => {
    http.get('/api/v1/algo').subscribe();

    const req = controller.expectOne('/api/v1/algo');
    expect(req.request.headers.get(CORRELATION_ID_HEADER)).toMatch(/^[0-9a-f-]{36}$/);
    req.flush({});
  });

  it('no lo agrega a otro origen: el CORS del backend no admite ese encabezado', () => {
    http.get('http://localhost:8080/api/v1/algo').subscribe();

    const req = controller.expectOne('http://localhost:8080/api/v1/algo');
    expect(req.request.headers.has(CORRELATION_ID_HEADER)).toBeFalse();
    req.flush({});
  });

  it('respeta el identificador que ya traiga la petición', () => {
    http.get('/api/v1/algo', { headers: { [CORRELATION_ID_HEADER]: 'fijo' } }).subscribe();

    const req = controller.expectOne('/api/v1/algo');
    expect(req.request.headers.get(CORRELATION_ID_HEADER)).toBe('fijo');
    req.flush({});
  });
});
