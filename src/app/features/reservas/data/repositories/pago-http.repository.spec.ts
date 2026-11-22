import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { ApiError } from '@core/http/api-error';
import { OMITIR_AVISO_403 } from '@core/http/http-contexts';
import { httpErrorInterceptor } from '@core/http/interceptors/http-error.interceptor';
import {
  IntentosDePagoAgotadosError,
  MontoBajoMinimoDePagoError,
  PagoNoIniciadoError,
  PasarelaDePagoNoDisponibleError,
  ReservaNoAdmitePagoError,
  ReservaNoEncontradaError,
  ReservaYaPagadaError,
  SinPermisoSobreReservaError,
} from '../../domain/errors/pago.errors';
import { Pago } from '../../domain/models/pago';
import { PagoHttpRepository } from './pago-http.repository';

describe('PagoHttpRepository', () => {
  const url = '/api-test/reservas/31/pago';
  const respuesta = {
    idPago: 7,
    idReserva: 31,
    estado: 'PENDIENTE',
    estadoReserva: 'PENDIENTE_PAGO',
    monto: 875000,
    moneda: 'COP',
    urlPago: 'https://checkout.stripe.com/c/pay/cs_test_abc',
    fechaExpiracion: '2030-06-01T10:35:00Z',
    codigoRechazo: null,
    motivoRechazo: null,
  };

  let repository: PagoHttpRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl: '/api-test' } },
        PagoHttpRepository,
      ],
    });
    repository = TestBed.inject(PagoHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const fallo = (metodo: 'iniciar' | 'consultar', estado: number, mensaje: string): unknown => {
    let capturado: unknown;
    repository[metodo](31).subscribe({ error: (error: unknown) => (capturado = error) });
    http
      .expectOne(url)
      .flush(
        { fecha: '', estado, error: 'Error', mensaje, ruta: '/api/v1/reservas/31/pago' },
        { status: estado, statusText: 'Error' },
      );
    return capturado;
  };

  describe('iniciar', () => {
    it('envía un POST sin cuerpo a /reservas/{id}/pago: el front no manda ningún monto', () => {
      repository.iniciar(31).subscribe();

      const req = http.expectOne(url);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      req.flush(respuesta);
    });

    it('marca la petición para que el 403 lo explique la pantalla', () => {
      repository.iniciar(31).subscribe();

      const req = http.expectOne(url);
      expect(req.request.context.get(OMITIR_AVISO_403)).toBeTrue();
      req.flush(respuesta);
    });

    for (const estado of [200, 201]) {
      it(`trata igual la respuesta ${estado} (sesión nueva o ya abierta)`, () => {
        let pago: Pago | undefined;
        repository.iniciar(31).subscribe((valor) => (pago = valor));

        http.expectOne(url).flush(respuesta, { status: estado, statusText: 'OK' });

        expect(pago).toEqual(respuesta as Pago);
      });
    }

    it('devuelve urlPago y el monto tal como llegan', () => {
      let pago: Pago | undefined;
      repository.iniciar(31).subscribe((valor) => (pago = valor));

      http.expectOne(url).flush(respuesta);

      expect(pago!.urlPago).toBe('https://checkout.stripe.com/c/pay/cs_test_abc');
      expect(pago!.monto).toBe(875000);
      expect(pago!.moneda).toBe('COP');
    });
  });

  describe('consultar', () => {
    it('envía un GET a /reservas/{id}/pago', () => {
      repository.consultar(31).subscribe();

      const req = http.expectOne(url);
      expect(req.request.method).toBe('GET');
      expect(req.request.context.get(OMITIR_AVISO_403)).toBeTrue();
      req.flush(respuesta);
    });

    it('trata como null los campos opcionales que no llegan', () => {
      let pago: Pago | undefined;
      repository.consultar(31).subscribe((valor) => (pago = valor));

      const sinOpcionales: Partial<typeof respuesta> = { ...respuesta, estado: 'APROBADO' };
      delete sinOpcionales.urlPago;
      delete sinOpcionales.codigoRechazo;
      delete sinOpcionales.motivoRechazo;
      http.expectOne(url).flush(sinOpcionales);

      expect(pago!.urlPago).toBeNull();
      expect(pago!.codigoRechazo).toBeNull();
      expect(pago!.motivoRechazo).toBeNull();
    });

    it('conserva el motivo del rechazo y su código', () => {
      let pago: Pago | undefined;
      repository.consultar(31).subscribe((valor) => (pago = valor));

      http.expectOne(url).flush({
        ...respuesta,
        estado: 'RECHAZADO',
        codigoRechazo: 'card_declined',
        motivoRechazo: 'La tarjeta fue rechazada',
      });

      expect(pago!.estado).toBe('RECHAZADO');
      expect(pago!.codigoRechazo).toBe('card_declined');
      expect(pago!.motivoRechazo).toBe('La tarjeta fue rechazada');
    });
  });

  describe('errores', () => {
    it('403: sin permiso sobre la reserva, con el mensaje del backend', () => {
      const error = fallo('iniciar', 403, 'No tiene permisos sobre esta reserva');

      expect(error).toBeInstanceOf(SinPermisoSobreReservaError);
      expect((error as Error).message).toBe('No tiene permisos sobre esta reserva');
    });

    it('404 "La reserva no existe": reserva no encontrada', () => {
      expect(fallo('iniciar', 404, 'La reserva no existe')).toBeInstanceOf(
        ReservaNoEncontradaError,
      );
    });

    it('404 al consultar sin pago: pago no iniciado', () => {
      const error = fallo('consultar', 404, 'La reserva no tiene un pago iniciado');

      expect(error).toBeInstanceOf(PagoNoIniciadoError);
    });

    it('409 "ya está pagada y confirmada": reserva ya pagada', () => {
      expect(fallo('iniciar', 409, 'La reserva ya está pagada y confirmada')).toBeInstanceOf(
        ReservaYaPagadaError,
      );
    });

    it('409 "venció o ya no admite pago": reserva sin pago posible', () => {
      const error = fallo(
        'iniciar',
        409,
        'La reserva venció o ya no admite pago; cree una nueva reserva',
      );

      expect(error).toBeInstanceOf(ReservaNoAdmitePagoError);
    });

    it('409 "se agotaron los intentos": intentos de pago agotados', () => {
      expect(
        fallo('iniciar', 409, 'Se agotaron los intentos de pago de esta reserva'),
      ).toBeInstanceOf(IntentosDePagoAgotadosError);
    });

    it('502: pasarela no disponible, con un mensaje propio aunque el ApiError sea genérico', () => {
      const error = fallo('iniciar', 502, 'No se pudo comunicar con la pasarela de pagos…');

      expect(error).toBeInstanceOf(PasarelaDePagoNoDisponibleError);
    });

    it('422 "menor al mínimo": monto bajo el mínimo de la pasarela, con el mensaje del backend', () => {
      const error = fallo(
        'iniciar',
        422,
        'El monto de la reserva es menor al mínimo que acepta la pasarela de pagos',
      );

      expect(error).toBeInstanceOf(MontoBajoMinimoDePagoError);
      expect((error as Error).message).toContain('menor al mínimo');
    });

    it('un 500 se propaga como ApiError', () => {
      const error = fallo('iniciar', 500, 'Error interno');

      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(500);
    });
  });
});
