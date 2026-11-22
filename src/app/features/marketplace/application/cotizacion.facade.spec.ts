import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import {
  AlojamientoNoCotizableError,
  CotizacionInvalidaError,
  FechasNoDisponiblesError,
  SinPermisoParaCotizarError,
} from '../domain/errors/cotizacion.errors';
import { Cotizacion, SolicitudCotizacion } from '../domain/models/cotizacion';
import { CotizacionRepository } from '../domain/repositories/cotizacion.repository';
import { CotizacionFacade } from './cotizacion.facade';

class RepositorioFalso extends CotizacionRepository {
  readonly solicitudes: SolicitudCotizacion[] = [];
  readonly respuestas: Subject<Cotizacion>[] = [];

  override cotizar(solicitud: SolicitudCotizacion): Observable<Cotizacion> {
    this.solicitudes.push(solicitud);
    const respuesta = new Subject<Cotizacion>();
    this.respuestas.push(respuesta);
    return respuesta;
  }

  get ultima(): Subject<Cotizacion> {
    return this.respuestas[this.respuestas.length - 1];
  }
}

const cotizacionDe = (total: number, noches = 3): Cotizacion => ({
  idPublicacion: 12,
  fechaLlegada: '2030-06-10',
  fechaSalida: '2030-06-13',
  noches,
  precio: {
    precioNoche: 250000,
    precioBase: 250000 * noches,
    porcentajeDescuento: 0,
    valorDescuento: 0,
    tarifaLimpieza: 50000,
    serviciosAdicionales: [],
    totalServiciosAdicionales: 0,
    porcentajeTarifaServicio: 10,
    tarifaServicio: 75000,
    total,
  },
});

describe('CotizacionFacade', () => {
  const solicitud: SolicitudCotizacion = {
    idPublicacion: 12,
    fechaLlegada: '2030-06-10',
    fechaSalida: '2030-06-13',
    huespedes: 2,
  };

  let repositorio: RepositorioFalso;
  let facade: CotizacionFacade;

  beforeEach(() => {
    repositorio = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [CotizacionFacade, { provide: CotizacionRepository, useValue: repositorio }],
    });
    facade = TestBed.inject(CotizacionFacade);
  });

  it('empieza inactiva y sin pedir nada', () => {
    expect(facade.estado()).toBe('inactiva');
    expect(facade.cotizacion()).toBeNull();
    expect(repositorio.solicitudes).toEqual([]);
  });

  describe('cotizar', () => {
    it('pasa a cotizando y luego a lista con el desglose recibido', () => {
      facade.cotizar(solicitud);

      expect(facade.estado()).toBe('cotizando');
      expect(facade.cotizando()).toBeTrue();
      expect(repositorio.solicitudes).toEqual([solicitud]);

      repositorio.ultima.next(cotizacionDe(1015000));

      expect(facade.estado()).toBe('lista');
      expect(facade.cotizando()).toBeFalse();
      expect(facade.cotizacion()?.precio.total).toBe(1015000);
    });

    it('no conserva el desglose anterior mientras llega el nuevo', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.next(cotizacionDe(1015000));

      facade.cotizar({ ...solicitud, fechaSalida: '2030-06-14' });

      expect(facade.estado()).toBe('cotizando');
      expect(facade.cotizacion()).toBeNull();
    });
  });

  describe('alCambiar', () => {
    it('no hace nada mientras la persona no haya pedido cotizar', () => {
      facade.alCambiar(solicitud);

      expect(repositorio.solicitudes).toEqual([]);
      expect(facade.estado()).toBe('inactiva');
    });

    it('vuelve a cotizar con los datos nuevos una vez pedida la primera cotización', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.next(cotizacionDe(1015000));

      facade.alCambiar({ ...solicitud, huespedes: 3 });

      expect(repositorio.solicitudes).toHaveSize(2);
      expect(repositorio.solicitudes[1].huespedes).toBe(3);
      expect(facade.estado()).toBe('cotizando');
    });

    it('con datos inválidos (null) descarta lo mostrado y no consulta', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.next(cotizacionDe(1015000));

      facade.alCambiar(null);

      expect(facade.estado()).toBe('inactiva');
      expect(facade.cotizacion()).toBeNull();
      expect(repositorio.solicitudes).toHaveSize(1);
    });

    it('después de datos inválidos, al volver a ser válidos vuelve a cotizar', () => {
      facade.cotizar(solicitud);
      facade.alCambiar(null);

      facade.alCambiar(solicitud);

      expect(repositorio.solicitudes).toHaveSize(2);
      expect(facade.estado()).toBe('cotizando');
    });

    it('una respuesta atrasada no pisa a la más reciente', () => {
      facade.cotizar(solicitud);
      const primera = repositorio.ultima;

      facade.alCambiar({ ...solicitud, fechaSalida: '2030-06-15' });
      const segunda = repositorio.ultima;

      segunda.next(cotizacionDe(1765000, 5));
      primera.next(cotizacionDe(1015000, 3));

      expect(facade.cotizacion()?.noches).toBe(5);
      expect(facade.cotizacion()?.precio.total).toBe(1765000);
    });

    it('si se descartan los datos, una respuesta que estaba en camino se ignora', () => {
      facade.cotizar(solicitud);
      const enCamino = repositorio.ultima;

      facade.alCambiar(null);
      enCamino.next(cotizacionDe(1015000));

      expect(facade.estado()).toBe('inactiva');
      expect(facade.cotizacion()).toBeNull();
    });
  });

  describe('errores', () => {
    it('409: fechas no disponibles, con el mensaje y sin desglose', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.error(new FechasNoDisponiblesError('No hay fechas'));

      expect(facade.estado()).toBe('fechas-no-disponibles');
      expect(facade.mensaje()).toBe('No hay fechas');
      expect(facade.cotizacion()).toBeNull();
    });

    it('404: alojamiento no disponible', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.error(new AlojamientoNoCotizableError());

      expect(facade.estado()).toBe('alojamiento-no-disponible');
      expect(facade.mensaje()).toBe('El alojamiento no está disponible');
    });

    it('403: sin permiso', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.error(new SinPermisoParaCotizarError());

      expect(facade.estado()).toBe('sin-permiso');
    });

    it('400: guarda los mensajes por campo', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.error(
        new CotizacionInvalidaError({ huespedes: 'El alojamiento admite como máximo 4 huéspedes' }),
      );

      expect(facade.estado()).toBe('invalida');
      expect(facade.errores().huespedes).toBe('El alojamiento admite como máximo 4 huéspedes');
    });

    it('cualquier otro fallo queda como error con su mensaje', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.error(new Error('No fue posible conectar con el servidor.'));

      expect(facade.estado()).toBe('error');
      expect(facade.mensaje()).toBe('No fue posible conectar con el servidor.');
    });

    it('un fallo sin mensaje usa uno genérico', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.error('algo');

      expect(facade.estado()).toBe('error');
      expect(facade.mensaje()).toContain('No fue posible cotizar la estancia');
    });

    it('tras un error, cambiar los datos vuelve a cotizar y limpia el error', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.error(new FechasNoDisponiblesError());

      facade.alCambiar({ ...solicitud, fechaLlegada: '2030-07-01', fechaSalida: '2030-07-04' });
      repositorio.ultima.next(cotizacionDe(1015000));

      expect(facade.estado()).toBe('lista');
      expect(facade.mensaje()).toBeNull();
    });
  });

  describe('solicitudCotizada (lo que se puede reservar)', () => {
    it('no hay nada cotizado al empezar', () => {
      expect(facade.solicitudCotizada()).toBeNull();
    });

    it('con la cotización lista devuelve exactamente lo que se cotizó', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.next(cotizacionDe(1015000));

      expect(facade.solicitudCotizada()).toEqual(solicitud);
    });

    it('mientras se vuelve a cotizar no hay nada que reservar', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.next(cotizacionDe(1015000));

      facade.alCambiar({ ...solicitud, huespedes: 3 });

      expect(facade.solicitudCotizada()).toBeNull();
    });

    it('tras la nueva cotización devuelve los datos nuevos', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.next(cotizacionDe(1015000));

      facade.alCambiar({ ...solicitud, huespedes: 3 });
      repositorio.ultima.next(cotizacionDe(1015000));

      expect(facade.solicitudCotizada()?.huespedes).toBe(3);
    });

    it('si la cotización falla no hay nada que reservar', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.error(new FechasNoDisponiblesError());

      expect(facade.solicitudCotizada()).toBeNull();
    });

    it('si los datos dejan de ser válidos no hay nada que reservar', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.next(cotizacionDe(1015000));

      facade.alCambiar(null);

      expect(facade.solicitudCotizada()).toBeNull();
    });
  });

  describe('reiniciar', () => {
    it('vuelve al comienzo: sin desglose y sin recotizar los cambios siguientes', () => {
      facade.cotizar(solicitud);
      repositorio.ultima.next(cotizacionDe(1015000));

      facade.reiniciar();
      facade.alCambiar(solicitud);

      expect(facade.estado()).toBe('inactiva');
      expect(facade.cotizacion()).toBeNull();
      expect(repositorio.solicitudes).toHaveSize(1);
    });

    it('cancela la cotización que estaba en camino', () => {
      facade.cotizar(solicitud);
      const enCamino = repositorio.ultima;

      facade.reiniciar();
      enCamino.next(cotizacionDe(1015000));

      expect(facade.estado()).toBe('inactiva');
    });
  });
});
