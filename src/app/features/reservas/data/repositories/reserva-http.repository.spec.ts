import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { OMITIR_AVISO_403 } from '@core/http/http-contexts';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import {
  AlojamientoNoReservableError,
  FechasNoDisponiblesParaReservarError,
  ReservaInvalidaError,
  SinPermisoParaReservarError,
} from '../../domain/errors/reserva.errors';
import { Reserva, SolicitudReserva } from '../../domain/models/reserva';
import { ReservaHttpRepository } from './reserva-http.repository';

describe('ReservaHttpRepository', () => {
  const url = '/api-test/reservas';
  const clave = '8d0c7f2e-4f43-4a58-9f3d-0f2a2c5a1b11';
  const solicitud: SolicitudReserva = {
    idPublicacion: 26,
    fechaLlegada: '2026-12-20',
    fechaSalida: '2026-12-23',
    huespedes: 2,
  };
  const respuesta = {
    idReserva: 2,
    idPublicacion: 26,
    fechaLlegada: '2026-12-20',
    fechaSalida: '2026-12-23',
    noches: 3,
    huespedes: 2,
    estado: 'PENDIENTE_PAGO',
    fechaExpiracion: '2026-11-22T06:19:18Z',
    precio: {
      precioBase: 540000,
      porcentajeDescuento: 0,
      valorDescuento: 0,
      tarifaLimpieza: 0,
      porcentajeTarifaServicio: 10,
      tarifaServicio: 54000,
      total: 594000,
    },
    politicaCancelacion: { horasAnticipacionMin: 24, porcentajeDevolucion: 100 },
  };

  let repository: ReservaHttpRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl: '/api-test' } },
        ReservaHttpRepository,
      ],
    });
    repository = TestBed.inject(ReservaHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const fallo = (estado: number, mensaje: string, extra: Record<string, unknown> = {}): unknown => {
    let capturado: unknown;
    repository
      .crear(solicitud, clave)
      .subscribe({ error: (error: unknown) => (capturado = error) });
    http
      .expectOne(url)
      .flush(
        { fecha: '', estado, error: 'Error', mensaje, ruta: '/api/v1/reservas', ...extra },
        { status: estado, statusText: 'Error' },
      );
    return capturado;
  };

  describe('petición', () => {
    it('envía un POST a /reservas con el alojamiento, las fechas y los huéspedes', () => {
      repository.crear(solicitud, clave).subscribe();

      const req = http.expectOne(url);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        idPublicacion: 26,
        fechaLlegada: '2026-12-20',
        fechaSalida: '2026-12-23',
        huespedes: 2,
      });
      req.flush(respuesta);
    });

    it('lleva la clave de idempotencia en el encabezado Idempotency-Key', () => {
      repository.crear(solicitud, clave).subscribe();

      const req = http.expectOne(url);
      expect(req.request.headers.get('Idempotency-Key')).toBe(clave);
      req.flush(respuesta);
    });

    it('no manda precios ni el Huésped: el backend los calcula y los toma del token', () => {
      repository.crear(solicitud, clave).subscribe();

      const req = http.expectOne(url);
      expect(Object.keys(req.request.body as object).sort()).toEqual([
        'fechaLlegada',
        'fechaSalida',
        'huespedes',
        'idPublicacion',
      ]);
      req.flush(respuesta);
    });

    it('marca la petición para que el 403 lo explique la pantalla', () => {
      repository.crear(solicitud, clave).subscribe();

      const req = http.expectOne(url);
      expect(req.request.context.get(OMITIR_AVISO_403)).toBeTrue();
      req.flush(respuesta);
    });
  });

  describe('respuesta', () => {
    for (const estado of [200, 201]) {
      it(`trata igual la respuesta ${estado} (reserva nueva o repetición con la misma clave)`, () => {
        let reserva: Reserva | undefined;
        repository.crear(solicitud, clave).subscribe((valor) => (reserva = valor));

        http.expectOne(url).flush(respuesta, { status: estado, statusText: 'OK' });

        expect(reserva!.idReserva).toBe(2);
        expect(reserva!.estado).toBe('PENDIENTE_PAGO');
      });
    }

    it('devuelve el precio tal como llega, sin recalcular nada', () => {
      let reserva: Reserva | undefined;
      repository.crear(solicitud, clave).subscribe((valor) => (reserva = valor));

      http.expectOne(url).flush(respuesta);

      expect(reserva!.precio.total).toBe(594000);
      expect(reserva!.noches).toBe(3);
      expect(reserva!.fechaExpiracion).toBe('2026-11-22T06:19:18Z');
    });
  });

  describe('errores', () => {
    it('400: reúne los mensajes por campo', () => {
      const error = fallo(400, 'Los datos enviados no son válidos', {
        errores: {
          huespedes: 'El alojamiento admite como máximo 2 huéspedes',
          fechaLlegada: 'La fecha de llegada no puede ser anterior a hoy',
        },
      });

      expect(error).toBeInstanceOf(ReservaInvalidaError);
      expect((error as ReservaInvalidaError).errores).toEqual({
        huespedes: 'El alojamiento admite como máximo 2 huéspedes',
        fechaLlegada: 'La fecha de llegada no puede ser anterior a hoy',
      });
    });

    it('400 sin campos conocidos (por ejemplo, falta la clave): deja el error original', () => {
      const error = fallo(400, 'Los datos enviados no son válidos', {
        errores: { 'Idempotency-Key': 'El encabezado Idempotency-Key es obligatorio' },
      });

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
    });

    it('403: sin permiso para reservar', () => {
      expect(fallo(403, 'No tiene permisos para esta operación')).toBeInstanceOf(
        SinPermisoParaReservarError,
      );
    });

    it('404: alojamiento no disponible, con el mensaje del backend', () => {
      const error = fallo(404, 'El alojamiento no está disponible');

      expect(error).toBeInstanceOf(AlojamientoNoReservableError);
      expect((error as Error).message).toBe('El alojamiento no está disponible');
    });

    it('409 "no están disponibles": fechas ocupadas', () => {
      const error = fallo(409, 'Las fechas seleccionadas no están disponibles');

      expect(error).toBeInstanceOf(FechasNoDisponiblesParaReservarError);
    });

    it('409 por clave ya usada con otra solicitud: se propaga como ApiError', () => {
      const error = fallo(409, 'La clave de idempotencia ya se usó con otra solicitud');

      expect(error).toBeInstanceOf(ApiError);
      expect(error).not.toBeInstanceOf(FechasNoDisponiblesParaReservarError);
    });

    it('un 500 se propaga como ApiError', () => {
      const error = fallo(500, 'Error interno');

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(500);
    });
  });
});
