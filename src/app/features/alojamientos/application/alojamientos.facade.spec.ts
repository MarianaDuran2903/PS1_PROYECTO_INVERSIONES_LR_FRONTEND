import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import {
  PaginaPublicaciones,
  PublicacionResumen,
} from '@features/publicaciones/domain/models/publicacion';
import { of, Subject, throwError } from 'rxjs';
import { AlojamientoRepository } from '../domain/repositories/alojamiento.repository';
import { AlojamientosFacade } from './alojamientos.facade';

/** HU-014: caso de uso "Ver los alojamientos disponibles". */
describe('AlojamientosFacade', () => {
  const alojamiento = (id: number): PublicacionResumen => ({
    idPublicacion: id,
    titulo: `Alojamiento ${id}`,
    estado: 'ACTIVA',
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    capacidad: 4,
    precioNoche: 250000,
  });
  const pagina = (
    contenido: PublicacionResumen[],
    numero = 0,
    totalPaginas = 1,
    totalElementos = contenido.length,
    mensaje: string | null = null,
  ): PaginaPublicaciones => ({
    contenido,
    pagina: numero,
    tamano: 10,
    totalElementos,
    totalPaginas,
    mensaje,
  });

  let repository: jasmine.SpyObj<AlojamientoRepository>;
  let facade: AlojamientosFacade;

  beforeEach(() => {
    repository = jasmine.createSpyObj<AlojamientoRepository>('AlojamientoRepository', ['listar']);
    repository.listar.and.returnValue(of(pagina([alojamiento(2), alojamiento(1)])));
    TestBed.configureTestingModule({
      providers: [AlojamientosFacade, { provide: AlojamientoRepository, useValue: repository }],
    });
    facade = TestBed.inject(AlojamientosFacade);
  });

  it('empieza cargando y pide la primera página con 10 por página', () => {
    expect(facade.estado()).toBe('cargando');

    facade.cargar();

    expect(repository.listar).toHaveBeenCalledOnceWith(0, 10);
    expect(facade.estado()).toBe('listo');
  });

  it('expone los alojamientos en el orden que llegan, sin reordenarlos', () => {
    repository.listar.and.returnValue(of(pagina([alojamiento(9), alojamiento(3), alojamiento(5)])));

    facade.cargar();

    expect(facade.alojamientos().map((a) => a.idPublicacion)).toEqual([9, 3, 5]);
    expect(facade.totalElementos()).toBe(3);
    expect(facade.vacia()).toBeFalse();
  });

  it('sin alojamientos queda vacía y muestra el mensaje de la API', () => {
    repository.listar.and.returnValue(
      of(pagina([], 0, 0, 0, 'No hay alojamientos disponibles por el momento')),
    );

    facade.cargar();

    expect(facade.vacia()).toBeTrue();
    expect(facade.mensajeVacio()).toBe('No hay alojamientos disponibles por el momento');
  });

  it('sin mensaje de la API usa uno de respaldo', () => {
    repository.listar.and.returnValue(of(pagina([], 0, 0, 0, null)));

    facade.cargar();

    expect(facade.mensajeVacio()).toBe('No hay alojamientos disponibles por el momento');
  });

  it('si falla queda en "error" y reintentar vuelve a pedir la misma página', () => {
    repository.listar.and.returnValue(
      throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
    );
    facade.cargar(1);
    expect(facade.estado()).toBe('error');

    repository.listar.and.returnValue(of(pagina([alojamiento(1)], 1, 2, 11)));
    facade.reintentar();

    expect(repository.listar).toHaveBeenCalledWith(1, 10);
    expect(facade.estado()).toBe('listo');
  });

  it('con varias páginas navega con siguiente y anterior', () => {
    repository.listar.and.returnValue(of(pagina([alojamiento(1)], 0, 3, 25)));
    facade.cargar();
    expect(facade.hayVariasPaginas()).toBeTrue();
    expect(facade.hayAnterior()).toBeFalse();
    expect(facade.haySiguiente()).toBeTrue();

    repository.listar.and.returnValue(of(pagina([alojamiento(11)], 1, 3, 25)));
    facade.siguiente();
    expect(repository.listar).toHaveBeenCalledWith(1, 10);
    expect(facade.paginaActual()).toBe(1);

    repository.listar.and.returnValue(of(pagina([alojamiento(1)], 0, 3, 25)));
    facade.anterior();
    expect(repository.listar).toHaveBeenCalledWith(0, 10);
  });

  it('con una sola página no hay paginación y no navega', () => {
    facade.cargar();

    expect(facade.hayVariasPaginas()).toBeFalse();
    repository.listar.calls.reset();
    facade.siguiente();
    facade.anterior();
    expect(repository.listar).not.toHaveBeenCalled();
  });

  it('una página fuera de rango salta a la última que existe', () => {
    repository.listar.and.callFake((numero) =>
      of(numero >= 2 ? pagina([], numero, 2, 12) : pagina([alojamiento(1)], numero, 2, 12)),
    );

    facade.cargar(5);

    expect(repository.listar).toHaveBeenCalledWith(5, 10);
    expect(repository.listar).toHaveBeenCalledWith(1, 10);
    expect(facade.paginaActual()).toBe(1);
  });

  it('una petición nueva cancela la anterior', () => {
    const lenta = new Subject<PaginaPublicaciones>();
    repository.listar.and.returnValues(lenta, of(pagina([alojamiento(1)])));

    facade.cargar(0);
    facade.cargar(0);
    lenta.next(pagina([alojamiento(99)]));

    expect(facade.alojamientos().map((a) => a.idPublicacion)).toEqual([1]);
  });
});
