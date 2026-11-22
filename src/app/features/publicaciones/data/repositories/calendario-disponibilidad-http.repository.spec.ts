import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { CalendarioDisponibilidadHttpRepository } from './calendario-disponibilidad-http.repository';

describe('CalendarioDisponibilidadHttpRepository: abrir', () => {
  const apiUrl = '/api-test';
  let repository: CalendarioDisponibilidadHttpRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl } },
        CalendarioDisponibilidadHttpRepository,
      ],
    });
    repository = TestBed.inject(CalendarioDisponibilidadHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envía POST con las fechas para la publicación solicitada', () => {
    repository.abrir(12, '2026-06-10', '2026-06-13').subscribe();

    const request = http.expectOne(`${apiUrl}/publicaciones/12/disponibilidad`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      fechaInicio: '2026-06-10',
      fechaFin: '2026-06-13',
    });
    request.flush({ idPeriodo: 3 });
  });
});
