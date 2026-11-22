import { Injectable } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { RedireccionExterna } from '@core/navigation/redireccion-externa.service';
import { Observable, of, Subject, throwError } from 'rxjs';
import {
  IntentosDePagoAgotadosError,
  PagoNoIniciadoError,
  PasarelaDePagoNoDisponibleError,
  ReservaNoEncontradaError,
  ReservaYaPagadaError,
  SinPermisoSobreReservaError,
} from '../domain/errors/pago.errors';
import { Pago } from '../domain/models/pago';
import { PagoRepository } from '../domain/repositories/pago.repository';
import {
  CONSULTAS_MAXIMAS,
  ESPERA_ENTRE_CONSULTAS_MS,
  ResultadoPagoFacade,
} from './resultado-pago.facade';

class RepositorioFalso extends PagoRepository {
  consultas = 0;
  iniciadas = 0;
  /** Lo que responde cada consulta, en orden; la última se repite. */
  respuestasConsulta: Observable<Pago>[] = [];
  respuestaIniciar: Observable<Pago> = new Subject<Pago>();

  override consultar(): Observable<Pago> {
    const indice = Math.min(this.consultas, this.respuestasConsulta.length - 1);
    this.consultas++;
    return this.respuestasConsulta[indice];
  }

  override iniciar(): Observable<Pago> {
    this.iniciadas++;
    return this.respuestaIniciar;
  }
}

@Injectable()
class RedireccionFalsa extends RedireccionExterna {
  readonly destinos: string[] = [];

  protected override navegar(url: string): void {
    this.destinos.push(url);
  }
}

const pagoDe = (extra: Partial<Pago> = {}): Pago => ({
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
  ...extra,
});
const aprobado = pagoDe({ estado: 'APROBADO', estadoReserva: 'CONFIRMADA', urlPago: null });
const rechazado = pagoDe({
  estado: 'RECHAZADO',
  codigoRechazo: 'card_declined',
  motivoRechazo: 'La tarjeta fue rechazada',
});
const expirado = pagoDe({ estado: 'EXPIRADO', urlPago: null });

describe('ResultadoPagoFacade', () => {
  let repositorio: RepositorioFalso;
  let redireccion: RedireccionFalsa;
  let facade: ResultadoPagoFacade;

  beforeEach(() => {
    repositorio = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [
        ResultadoPagoFacade,
        { provide: PagoRepository, useValue: repositorio },
        { provide: RedireccionExterna, useClass: RedireccionFalsa },
      ],
    });
    facade = TestBed.inject(ResultadoPagoFacade);
    redireccion = TestBed.inject(RedireccionExterna) as RedireccionFalsa;
  });

  const responderCon = (...respuestas: Observable<Pago>[]) => {
    repositorio.respuestasConsulta = respuestas;
  };

  describe('estados finales', () => {
    it('APROBADO: pago aprobado, y no vuelve a consultar', fakeAsync(() => {
      responderCon(of(aprobado));

      facade.cargar(31, false);
      tick(ESPERA_ENTRE_CONSULTAS_MS * 3);

      expect(facade.estado()).toBe('aprobado');
      expect(facade.pago()?.estadoReserva).toBe('CONFIRMADA');
      expect(repositorio.consultas).toBe(1);
    }));

    it('RECHAZADO: rechazado, con el motivo tal cual', fakeAsync(() => {
      responderCon(of(rechazado));

      facade.cargar(31, false);
      tick(ESPERA_ENTRE_CONSULTAS_MS * 3);

      expect(facade.estado()).toBe('rechazado');
      expect(facade.pago()?.motivoRechazo).toBe('La tarjeta fue rechazada');
      expect(repositorio.consultas).toBe(1);
    }));

    it('EXPIRADO: expirado', fakeAsync(() => {
      responderCon(of(expirado));

      facade.cargar(31, false);

      expect(facade.estado()).toBe('expirado');
    }));

    it('siempre consulta al backend al cargar: no guarda el estado en el front', () => {
      responderCon(of(aprobado));

      facade.cargar(31, false);
      facade.cargar(31, false);

      expect(repositorio.consultas).toBe(2);
    });

    it('al empezar está "cargando"', () => {
      responderCon(new Subject<Pago>());

      facade.cargar(31, false);

      expect(facade.estado()).toBe('cargando');
    });
  });

  describe('PENDIENTE: espera de la confirmación', () => {
    it('queda "procesando" y vuelve a consultar cada 2,5 segundos', fakeAsync(() => {
      responderCon(of(pagoDe()));

      facade.cargar(31, false);

      expect(facade.estado()).toBe('procesando');
      expect(repositorio.consultas).toBe(1);

      tick(ESPERA_ENTRE_CONSULTAS_MS - 1);
      expect(repositorio.consultas).toBe(1);

      tick(1);
      expect(repositorio.consultas).toBe(2);
      tick(ESPERA_ENTRE_CONSULTAS_MS);
      expect(repositorio.consultas).toBe(3);

      facade.cargar(null, false); // detiene la espera
    }));

    it('cuando llega la aprobación deja de consultar', fakeAsync(() => {
      responderCon(of(pagoDe()), of(pagoDe()), of(aprobado));

      facade.cargar(31, false);
      tick(ESPERA_ENTRE_CONSULTAS_MS * 2);

      expect(facade.estado()).toBe('aprobado');
      tick(ESPERA_ENTRE_CONSULTAS_MS * 5);
      expect(repositorio.consultas).toBe(3);
    }));

    it('tras 10 consultas sigue pendiente: "sin confirmación", y no consulta más', fakeAsync(() => {
      responderCon(of(pagoDe()));

      facade.cargar(31, false);
      tick(ESPERA_ENTRE_CONSULTAS_MS * (CONSULTAS_MAXIMAS + 5));

      expect(CONSULTAS_MAXIMAS).toBe(10);
      expect(repositorio.consultas).toBe(10);
      expect(facade.estado()).toBe('sin-confirmacion');
    }));

    it('"Consultar de nuevo" empieza otra tanda de consultas', fakeAsync(() => {
      responderCon(of(pagoDe()));
      facade.cargar(31, false);
      tick(ESPERA_ENTRE_CONSULTAS_MS * CONSULTAS_MAXIMAS);
      expect(facade.estado()).toBe('sin-confirmacion');

      responderCon(of(aprobado));
      facade.reintentarConsulta();

      expect(facade.estado()).toBe('aprobado');
      expect(repositorio.consultas).toBe(11);
    }));

    it('volver a cargar cancela la espera anterior', fakeAsync(() => {
      responderCon(of(pagoDe()));
      facade.cargar(31, false);

      responderCon(of(aprobado));
      facade.cargar(31, false);
      tick(ESPERA_ENTRE_CONSULTAS_MS * 3);

      expect(repositorio.consultas).toBe(2);
      expect(facade.estado()).toBe('aprobado');
    }));
  });

  describe('volvió cancelando (?cancelado=true)', () => {
    it('con el pago pendiente: "cancelado", sin esperar ningún resultado', fakeAsync(() => {
      responderCon(of(pagoDe()));

      facade.cargar(31, true);
      tick(ESPERA_ENTRE_CONSULTAS_MS * 3);

      expect(facade.estado()).toBe('cancelado');
      expect(repositorio.consultas).toBe(1);
    }));

    it('si en realidad el pago ya estaba aprobado, lo muestra aprobado', () => {
      responderCon(of(aprobado));

      facade.cargar(31, true);

      expect(facade.estado()).toBe('aprobado');
    });

    it('si el pago fue rechazado, lo muestra rechazado', () => {
      responderCon(of(rechazado));

      facade.cargar(31, true);

      expect(facade.estado()).toBe('rechazado');
    });

    it('si venció, lo muestra expirado', () => {
      responderCon(of(expirado));

      facade.cargar(31, true);

      expect(facade.estado()).toBe('expirado');
    });
  });

  describe('errores al consultar', () => {
    const cargarConError = (error: unknown) => {
      responderCon(throwError(() => error));
      facade.cargar(31, false);
    };

    it('404 sin pago iniciado: ofrece pagar', () => {
      cargarConError(new PagoNoIniciadoError());

      expect(facade.estado()).toBe('error');
      expect(facade.error()?.tipo).toBe('sin-pago');
    });

    it('404 reserva inexistente', () => {
      cargarConError(new ReservaNoEncontradaError());

      expect(facade.error()?.tipo).toBe('no-encontrada');
    });

    it('403 sin permiso', () => {
      cargarConError(new SinPermisoSobreReservaError());

      expect(facade.error()?.tipo).toBe('sin-permiso');
    });

    it('otro fallo: error genérico, y se puede reintentar la consulta', () => {
      cargarConError(new Error('Error inesperado'));
      expect(facade.error()).toEqual({ tipo: 'otro', mensaje: 'Error inesperado' });

      responderCon(of(aprobado));
      facade.reintentarConsulta();

      expect(facade.estado()).toBe('aprobado');
      expect(facade.error()).toBeNull();
    });

    it('con un identificador inválido (null) no consulta', () => {
      facade.cargar(null, false);

      expect(repositorio.consultas).toBe(0);
      expect(facade.estado()).toBe('error');
      expect(facade.error()?.tipo).toBe('no-encontrada');
    });
  });

  describe('irAPago ("Intentar con otra tarjeta")', () => {
    it('lleva a la dirección de pago vigente', () => {
      responderCon(of(rechazado));
      facade.cargar(31, false);

      facade.irAPago();

      expect(redireccion.destinos).toEqual(['https://checkout.stripe.com/c/pay/cs_test_abc']);
      expect(repositorio.iniciadas).toBe(0);
    });

    it('si ya no hay dirección, pide una sesión nueva', () => {
      responderCon(of({ ...rechazado, urlPago: null }));
      facade.cargar(31, false);

      facade.irAPago();

      expect(redireccion.destinos).toEqual([]);
      expect(repositorio.iniciadas).toBe(1);
    });
  });

  describe('reintentarPago ("Intentar de nuevo" tras vencer)', () => {
    let nuevaSesion: Subject<Pago>;

    beforeEach(() => {
      nuevaSesion = new Subject<Pago>();
      repositorio.respuestaIniciar = nuevaSesion;
      responderCon(of(expirado));
      facade.cargar(31, false);
    });

    it('pide otra sesión, espera y luego lleva a la nueva página de pago', () => {
      facade.reintentarPago();

      expect(repositorio.iniciadas).toBe(1);
      expect(facade.reintentando()).toBeTrue();

      nuevaSesion.next(pagoDe({ urlPago: 'https://checkout.stripe.com/c/pay/cs_test_nueva' }));

      expect(redireccion.destinos).toEqual(['https://checkout.stripe.com/c/pay/cs_test_nueva']);
    });

    it('no pide dos sesiones a la vez', () => {
      facade.reintentarPago();
      facade.reintentarPago();

      expect(repositorio.iniciadas).toBe(1);
    });

    it('409 se agotaron los intentos: lo explica sin cambiar lo que se muestra', () => {
      facade.reintentarPago();
      nuevaSesion.error(new IntentosDePagoAgotadosError());

      expect(facade.errorAccion()?.tipo).toBe('intentos-agotados');
      expect(facade.reintentando()).toBeFalse();
      expect(facade.estado()).toBe('expirado');
    });

    it('502 pasarela: permite reintentar en unos minutos', () => {
      facade.reintentarPago();
      nuevaSesion.error(new PasarelaDePagoNoDisponibleError());

      expect(facade.errorAccion()?.tipo).toBe('pasarela');
      expect(facade.reintentando()).toBeFalse();
    });

    it('409 ya pagada: vuelve a consultar y muestra el resultado real', () => {
      facade.reintentarPago();
      responderCon(of(aprobado));
      nuevaSesion.error(new ReservaYaPagadaError());

      expect(facade.estado()).toBe('aprobado');
      expect(facade.reintentando()).toBeFalse();
    });

    it('si la dirección nueva no sirve, lo informa y no redirige', () => {
      facade.reintentarPago();
      nuevaSesion.next(pagoDe({ urlPago: 'http://inseguro.example/pagar' }));

      expect(redireccion.destinos).toEqual([]);
      expect(facade.errorAccion()?.tipo).toBe('otro');
      expect(facade.reintentando()).toBeFalse();
    });

    it('un nuevo intento limpia el error anterior', () => {
      facade.reintentarPago();
      nuevaSesion.error(new PasarelaDePagoNoDisponibleError());
      expect(facade.errorAccion()).not.toBeNull();

      repositorio.respuestaIniciar = new Subject<Pago>();
      facade.reintentarPago();

      expect(facade.errorAccion()).toBeNull();
    });
  });
});
