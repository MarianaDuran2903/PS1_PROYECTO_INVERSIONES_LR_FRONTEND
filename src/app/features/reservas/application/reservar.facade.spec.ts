import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import { Observable, Subject } from 'rxjs';
import {
  AlojamientoNoReservableError,
  FechasNoDisponiblesParaReservarError,
  ReservaInvalidaError,
  SinPermisoParaReservarError,
} from '../domain/errors/reserva.errors';
import { Reserva, SolicitudReserva } from '../domain/models/reserva';
import { ReservaRepository } from '../domain/repositories/reserva.repository';
import { ReservarFacade } from './reservar.facade';

class RepositorioFalso extends ReservaRepository {
  readonly llamadas: { solicitud: SolicitudReserva; clave: string }[] = [];
  readonly respuestas: Subject<Reserva>[] = [];

  override crear(solicitud: SolicitudReserva, clave: string): Observable<Reserva> {
    this.llamadas.push({ solicitud, clave });
    const respuesta = new Subject<Reserva>();
    this.respuestas.push(respuesta);
    return respuesta;
  }

  get ultima(): Subject<Reserva> {
    return this.respuestas[this.respuestas.length - 1];
  }
}

const reservaDe = (idReserva: number): Reserva => ({
  idReserva,
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
});

describe('ReservarFacade', () => {
  const solicitud: SolicitudReserva = {
    idPublicacion: 26,
    fechaLlegada: '2026-12-20',
    fechaSalida: '2026-12-23',
    huespedes: 2,
  };

  let repositorio: RepositorioFalso;
  let facade: ReservarFacade;
  let creadas: Reserva[];

  beforeEach(() => {
    repositorio = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [ReservarFacade, { provide: ReservaRepository, useValue: repositorio }],
    });
    facade = TestBed.inject(ReservarFacade);
    creadas = [];
    facade.reservaCreada$.subscribe((reserva) => creadas.push(reserva));
  });

  it('empieza inactiva y sin pedir nada', () => {
    expect(facade.estado()).toBe('inactiva');
    expect(facade.error()).toBeNull();
    expect(repositorio.llamadas).toEqual([]);
  });

  describe('reservar', () => {
    it('crea la reserva de lo cotizado con una clave de idempotencia y espera', () => {
      facade.reservar(solicitud);

      expect(repositorio.llamadas).toHaveSize(1);
      expect(repositorio.llamadas[0].solicitud).toEqual(solicitud);
      expect(repositorio.llamadas[0].clave).toMatch(/^[0-9a-f-]{36}$/);
      expect(facade.estado()).toBe('reservando');
      expect(facade.reservando()).toBeTrue();
    });

    it('al crearse emite la reserva para llevar a pagar y vuelve a inactiva', () => {
      facade.reservar(solicitud);
      repositorio.ultima.next(reservaDe(2));

      expect(creadas.map((r) => r.idReserva)).toEqual([2]);
      expect(facade.estado()).toBe('inactiva');
    });

    it('no crea dos reservas a la vez si se pulsa dos veces', () => {
      facade.reservar(solicitud);
      facade.reservar(solicitud);

      expect(repositorio.llamadas).toHaveSize(1);
    });
  });

  describe('clave de idempotencia', () => {
    it('tras crear la reserva, una reserva nueva usa otra clave', () => {
      facade.reservar(solicitud);
      repositorio.ultima.next(reservaDe(2));

      facade.reservar(solicitud);

      expect(repositorio.llamadas[1].clave).not.toBe(repositorio.llamadas[0].clave);
    });

    it('con otros datos usa otra clave', () => {
      facade.reservar(solicitud);
      repositorio.ultima.error(new ApiError(0, 'NETWORK_ERROR', 'Sin conexión'));

      facade.reservar({ ...solicitud, fechaSalida: '2026-12-24' });

      expect(repositorio.llamadas[1].clave).not.toBe(repositorio.llamadas[0].clave);
    });

    it('tras un corte de red y los mismos datos, reintenta con LA MISMA clave (no duplica)', () => {
      facade.reservar(solicitud);
      repositorio.ultima.error(new ApiError(0, 'NETWORK_ERROR', 'Sin conexión'));

      facade.reservar(solicitud);

      expect(repositorio.llamadas[1].clave).toBe(repositorio.llamadas[0].clave);
    });

    it('tras un fallo del servidor (5xx) también conserva la clave', () => {
      facade.reservar(solicitud);
      repositorio.ultima.error(new ApiError(500, 'HTTP_500', 'Error'));

      facade.reservar(solicitud);

      expect(repositorio.llamadas[1].clave).toBe(repositorio.llamadas[0].clave);
    });

    it('tras una respuesta definitiva (409) usa una clave nueva', () => {
      facade.reservar(solicitud);
      repositorio.ultima.error(new FechasNoDisponiblesParaReservarError());

      facade.reservar(solicitud);

      expect(repositorio.llamadas[1].clave).not.toBe(repositorio.llamadas[0].clave);
    });
  });

  describe('errores', () => {
    const fallar = (error: unknown) => {
      facade.reservar(solicitud);
      repositorio.ultima.error(error);
    };

    it('409 fechas no disponibles', () => {
      fallar(new FechasNoDisponiblesParaReservarError());

      expect(facade.estado()).toBe('error');
      expect(facade.error()?.tipo).toBe('fechas-no-disponibles');
      expect(creadas).toEqual([]);
    });

    it('404 alojamiento no disponible', () => {
      fallar(new AlojamientoNoReservableError());

      expect(facade.error()?.tipo).toBe('alojamiento-no-disponible');
    });

    it('403 sin permiso', () => {
      fallar(new SinPermisoParaReservarError());

      expect(facade.error()?.tipo).toBe('sin-permiso');
    });

    it('400 guarda los mensajes por campo', () => {
      fallar(new ReservaInvalidaError({ huespedes: 'Demasiados huéspedes' }));

      expect(facade.error()?.tipo).toBe('invalida');
      expect(facade.error()?.errores.huespedes).toBe('Demasiados huéspedes');
    });

    it('cualquier otro fallo queda como "otro" con su mensaje', () => {
      fallar(new Error('No fue posible conectar con el servidor.'));

      expect(facade.error()).toEqual({
        tipo: 'otro',
        mensaje: 'No fue posible conectar con el servidor.',
        errores: {},
      });
    });

    it('después de un error se puede volver a intentar y se limpia el aviso', () => {
      fallar(new ApiError(0, 'NETWORK_ERROR', 'Sin conexión'));

      facade.reservar(solicitud);

      expect(facade.estado()).toBe('reservando');
      expect(facade.error()).toBeNull();
    });
  });

  describe('limpiar', () => {
    it('quita el aviso de error', () => {
      facade.reservar(solicitud);
      repositorio.ultima.error(new FechasNoDisponiblesParaReservarError());

      facade.limpiar();

      expect(facade.estado()).toBe('inactiva');
      expect(facade.error()).toBeNull();
    });

    it('cancela la reserva que estaba en camino: una respuesta tardía no lleva a pagar', () => {
      facade.reservar(solicitud);
      const enCamino = repositorio.ultima;

      facade.limpiar();
      enCamino.next(reservaDe(2));

      expect(creadas).toEqual([]);
      expect(facade.estado()).toBe('inactiva');
    });
  });
});
