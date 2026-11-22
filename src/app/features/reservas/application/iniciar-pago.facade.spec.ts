import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RedireccionExterna } from '@core/navigation/redireccion-externa.service';
import { Observable, Subject } from 'rxjs';
import {
  IntentosDePagoAgotadosError,
  PasarelaDePagoNoDisponibleError,
  ReservaNoAdmitePagoError,
  ReservaYaPagadaError,
} from '../domain/errors/pago.errors';
import { Pago } from '../domain/models/pago';
import { PagoRepository } from '../domain/repositories/pago.repository';
import { IniciarPagoFacade } from './iniciar-pago.facade';

class RepositorioFalso extends PagoRepository {
  readonly iniciadas: number[] = [];
  readonly respuestas: Subject<Pago>[] = [];

  override iniciar(idReserva: number): Observable<Pago> {
    this.iniciadas.push(idReserva);
    const respuesta = new Subject<Pago>();
    this.respuestas.push(respuesta);
    return respuesta;
  }

  override consultar(): Observable<Pago> {
    throw new Error('No se consulta al iniciar el pago');
  }

  get ultima(): Subject<Pago> {
    return this.respuestas[this.respuestas.length - 1];
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

describe('IniciarPagoFacade', () => {
  let repositorio: RepositorioFalso;
  let redireccion: RedireccionFalsa;
  let facade: IniciarPagoFacade;

  beforeEach(() => {
    repositorio = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [
        IniciarPagoFacade,
        { provide: PagoRepository, useValue: repositorio },
        { provide: RedireccionExterna, useClass: RedireccionFalsa },
      ],
    });
    facade = TestBed.inject(IniciarPagoFacade);
    redireccion = TestBed.inject(RedireccionExterna) as RedireccionFalsa;
  });

  it('empieza en "inicial" sin pedir nada', () => {
    expect(facade.estado()).toBe('inicial');
    expect(facade.pago()).toBeNull();
    expect(repositorio.iniciadas).toEqual([]);
  });

  it('al iniciar pide la sesión de pago de esa reserva y espera', () => {
    facade.iniciar(31);

    expect(repositorio.iniciadas).toEqual([31]);
    expect(facade.estado()).toBe('iniciando');
  });

  it('con la respuesta queda "listo" con el pago, para mostrar el monto', () => {
    facade.iniciar(31);
    repositorio.ultima.next(pagoDe());

    expect(facade.estado()).toBe('listo');
    expect(facade.pago()?.monto).toBe(875000);
  });

  it('no redirige solo: espera a que la persona continúe', () => {
    facade.iniciar(31);
    repositorio.ultima.next(pagoDe());

    expect(redireccion.destinos).toEqual([]);
  });

  it('continuar lleva a la página de pago', () => {
    facade.iniciar(31);
    repositorio.ultima.next(pagoDe());

    facade.continuar();

    expect(redireccion.destinos).toEqual(['https://checkout.stripe.com/c/pay/cs_test_abc']);
    expect(facade.estado()).toBe('listo');
  });

  it('continuar con una dirección que no sirve lo informa y no redirige', () => {
    facade.iniciar(31);
    repositorio.ultima.next(pagoDe({ urlPago: 'javascript:alert(1)' }));

    facade.continuar();

    expect(redireccion.destinos).toEqual([]);
    expect(facade.estado()).toBe('error');
    expect(facade.error()?.mensaje).toContain('No pudimos abrir la página de pago');
  });

  it('continuar sin urlPago lo informa', () => {
    facade.iniciar(31);
    repositorio.ultima.next(pagoDe({ urlPago: null }));

    facade.continuar();

    expect(facade.estado()).toBe('error');
  });

  it('no inicia dos veces a la vez', () => {
    facade.iniciar(31);
    facade.iniciar(31);

    expect(repositorio.iniciadas).toEqual([31]);
  });

  it('con un identificador inválido (null) no consulta y dice que la reserva no existe', () => {
    facade.iniciar(null);

    expect(repositorio.iniciadas).toEqual([]);
    expect(facade.estado()).toBe('error');
    expect(facade.error()?.tipo).toBe('no-encontrada');
  });

  describe('errores', () => {
    const iniciarCon = (error: unknown) => {
      facade.iniciar(31);
      repositorio.ultima.error(error);
    };

    it('409 ya pagada', () => {
      iniciarCon(new ReservaYaPagadaError());

      expect(facade.estado()).toBe('error');
      expect(facade.error()?.tipo).toBe('ya-pagada');
    });

    it('409 la reserva venció', () => {
      iniciarCon(new ReservaNoAdmitePagoError());

      expect(facade.error()?.tipo).toBe('no-admite-pago');
    });

    it('409 intentos agotados', () => {
      iniciarCon(new IntentosDePagoAgotadosError());

      expect(facade.error()?.tipo).toBe('intentos-agotados');
    });

    it('502 pasarela no disponible, con un mensaje para reintentar en unos minutos', () => {
      iniciarCon(new PasarelaDePagoNoDisponibleError());

      expect(facade.error()?.tipo).toBe('pasarela');
      expect(facade.error()?.mensaje).toContain('intenta de nuevo en unos minutos');
    });

    it('después de un error se puede volver a intentar', () => {
      iniciarCon(new PasarelaDePagoNoDisponibleError());

      facade.iniciar(31);
      repositorio.ultima.next(pagoDe());

      expect(repositorio.iniciadas).toEqual([31, 31]);
      expect(facade.estado()).toBe('listo');
      expect(facade.error()).toBeNull();
    });
  });

  it('reiniciar vuelve al comienzo y cancela lo que estaba en camino', () => {
    facade.iniciar(31);
    const enCamino = repositorio.ultima;

    facade.reiniciar();
    enCamino.next(pagoDe());

    expect(facade.estado()).toBe('inicial');
    expect(facade.pago()).toBeNull();
  });
});
