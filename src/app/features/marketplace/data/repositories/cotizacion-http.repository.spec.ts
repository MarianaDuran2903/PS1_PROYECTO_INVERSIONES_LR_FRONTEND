import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { OMITIR_AVISO_403 } from '@core/http/http-contexts';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import {
  AlojamientoNoCotizableError,
  CotizacionInvalidaError,
  FechasNoDisponiblesError,
  SinPermisoParaCotizarError,
} from '../../domain/errors/cotizacion.errors';
import { Cotizacion, SolicitudCotizacion } from '../../domain/models/cotizacion';
import { CotizacionHttpRepository } from './cotizacion-http.repository';

describe('CotizacionHttpRepository', () => {
  const url = '/api-test/cotizaciones';
  const solicitud: SolicitudCotizacion = {
    idPublicacion: 12,
    fechaLlegada: '2030-06-10',
    fechaSalida: '2030-06-13',
    huespedes: 2,
  };
  const respuesta = {
    idPublicacion: 12,
    fechaLlegada: '2030-06-10',
    fechaSalida: '2030-06-13',
    noches: 3,
    precio: {
      precioNoche: 250000,
      precioBase: 750000,
      porcentajeDescuento: 0,
      valorDescuento: 0,
      tarifaLimpieza: 50000,
      serviciosAdicionales: [
        { nombre: 'Desayuno', tipoCobro: 'POR_NOCHE', precio: 20000, valor: 60000 },
        { nombre: 'Traslado', tipoCobro: 'POR_ESTANCIA', precio: 80000, valor: 80000 },
      ],
      totalServiciosAdicionales: 140000,
      porcentajeTarifaServicio: 10,
      tarifaServicio: 75000,
      total: 1015000,
    },
  };

  let repository: CotizacionHttpRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl: '/api-test' } },
        CotizacionHttpRepository,
      ],
    });
    repository = TestBed.inject(CotizacionHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const fallo = (
    estado: number,
    cuerpo: Record<string, unknown>,
    texto = 'Error',
  ): { error: unknown } => {
    let capturado: unknown;
    repository.cotizar(solicitud).subscribe({ error: (error: unknown) => (capturado = error) });
    http
      .expectOne(url)
      .flush(
        { fecha: '', estado, error: texto, ruta: '/api/v1/cotizaciones', ...cuerpo },
        { status: estado, statusText: texto },
      );
    return { error: capturado };
  };

  describe('petición', () => {
    it('envía un POST a /cotizaciones con las fechas y los huéspedes', () => {
      repository.cotizar(solicitud).subscribe();

      const req = http.expectOne(url);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        idPublicacion: 12,
        fechaLlegada: '2030-06-10',
        fechaSalida: '2030-06-13',
        huespedes: 2,
      });
      req.flush(respuesta);
    });

    it('omite los huéspedes y los servicios cuando no se conocen', () => {
      repository
        .cotizar({ idPublicacion: 12, fechaLlegada: '2030-06-10', fechaSalida: '2030-06-13' })
        .subscribe();

      const req = http.expectOne(url);
      expect(req.request.body).toEqual({
        idPublicacion: 12,
        fechaLlegada: '2030-06-10',
        fechaSalida: '2030-06-13',
      });
      req.flush(respuesta);
    });

    it('no envía serviciosAdicionales si la lista está vacía', () => {
      repository.cotizar({ ...solicitud, serviciosAdicionales: [] }).subscribe();

      const req = http.expectOne(url);
      expect('serviciosAdicionales' in (req.request.body as object)).toBeFalse();
      req.flush(respuesta);
    });

    it('envía los servicios adicionales que se conocen', () => {
      repository
        .cotizar({ ...solicitud, serviciosAdicionales: ['Desayuno', 'Traslado'] })
        .subscribe();

      const req = http.expectOne(url);
      expect((req.request.body as { serviciosAdicionales: string[] }).serviciosAdicionales).toEqual(
        ['Desayuno', 'Traslado'],
      );
      req.flush(respuesta);
    });

    it('marca la petición para que el 403 lo explique la pantalla', () => {
      repository.cotizar(solicitud).subscribe();

      const req = http.expectOne(url);
      expect(req.request.context.get(OMITIR_AVISO_403)).toBeTrue();
      req.flush(respuesta);
    });
  });

  describe('respuesta', () => {
    it('devuelve el desglose tal como llega, sin recalcular nada', () => {
      let cotizacion: Cotizacion | undefined;
      repository.cotizar(solicitud).subscribe((valor) => (cotizacion = valor));

      http.expectOne(url).flush(respuesta);

      expect(cotizacion).toEqual(respuesta as Cotizacion);
      expect(cotizacion!.precio.total).toBe(1015000);
      expect(cotizacion!.precio.serviciosAdicionales[1].tipoCobro).toBe('POR_ESTANCIA');
    });

    it('trata serviciosAdicionales ausente como una lista vacía', () => {
      let cotizacion: Cotizacion | undefined;
      repository.cotizar(solicitud).subscribe((valor) => (cotizacion = valor));

      const precioSinServicios: Partial<typeof respuesta.precio> = { ...respuesta.precio };
      delete precioSinServicios.serviciosAdicionales;
      http.expectOne(url).flush({ ...respuesta, precio: precioSinServicios });

      expect(cotizacion!.precio.serviciosAdicionales).toEqual([]);
    });
  });

  describe('errores', () => {
    it('400: reúne los mensajes por campo', () => {
      const { error } = fallo(400, {
        mensaje: 'Los datos enviados no son válidos',
        errores: {
          fechaLlegada: 'La fecha de llegada no puede ser anterior a hoy',
          huespedes: 'El alojamiento admite como máximo 4 huéspedes',
        },
      });

      expect(error).toBeInstanceOf(CotizacionInvalidaError);
      expect((error as CotizacionInvalidaError).errores).toEqual({
        fechaLlegada: 'La fecha de llegada no puede ser anterior a hoy',
        huespedes: 'El alojamiento admite como máximo 4 huéspedes',
      });
    });

    it('400: rangoFechasValido se muestra en el campo de la salida', () => {
      const { error } = fallo(400, {
        mensaje: 'Los datos enviados no son válidos',
        errores: { rangoFechasValido: 'La salida debe ser posterior a la llegada' },
      });

      expect((error as CotizacionInvalidaError).errores).toEqual({
        fechaSalida: 'La salida debe ser posterior a la llegada',
      });
    });

    it('400: los servicios rechazados quedan en serviciosAdicionales', () => {
      const { error } = fallo(400, {
        mensaje: 'Los datos enviados no son válidos',
        errores: { serviciosAdicionales: 'Hay servicios repetidos' },
      });

      expect((error as CotizacionInvalidaError).errores).toEqual({
        serviciosAdicionales: 'Hay servicios repetidos',
      });
    });

    it('400 sin campos conocidos: deja el error original', () => {
      const { error } = fallo(400, { mensaje: 'Solicitud mal formada' });

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
    });

    it('403: sin permiso para cotizar', () => {
      const { error } = fallo(403, { mensaje: 'Acceso denegado' }, 'Forbidden');

      expect(error).toBeInstanceOf(SinPermisoParaCotizarError);
    });

    it('404: alojamiento no disponible, con el mensaje del backend', () => {
      const { error } = fallo(404, { mensaje: 'El alojamiento no está disponible' }, 'Not Found');

      expect(error).toBeInstanceOf(AlojamientoNoCotizableError);
      expect((error as Error).message).toBe('El alojamiento no está disponible');
    });

    it('409: fechas no disponibles, con el mensaje del backend', () => {
      const { error } = fallo(
        409,
        { mensaje: 'No se puede generar una cotización para las fechas seleccionadas' },
        'Conflict',
      );

      expect(error).toBeInstanceOf(FechasNoDisponiblesError);
      expect((error as Error).message).toBe(
        'No se puede generar una cotización para las fechas seleccionadas',
      );
    });

    it('un 500 o un corte de red se propagan como ApiError', () => {
      const { error } = fallo(500, {}, 'Internal Server Error');

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(500);
    });
  });
});
