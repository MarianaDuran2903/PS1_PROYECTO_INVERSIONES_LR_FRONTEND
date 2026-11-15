import { TestBed } from '@angular/core/testing';
import { BusquedaAlojamientosFacade } from './busqueda-alojamientos.facade';
import { BusquedaAlojamientosRepository } from '../domain/repositories/busqueda-alojamientos.repository';
import {
  CatalogoAlojamiento,
  PaginaAlojamientos,
} from '@features/marketplace/domain/models/busqueda-alojamientos';
import { Subject } from 'rxjs';

describe('BusquedaAlojamientosFacade', () => {
  const preparar = () => {
    const listar = jasmine.createSpy('listar').and.returnValue(new Subject<PaginaAlojamientos>());

    const listarCiudades = jasmine
      .createSpy('listarCiudades')
      .and.returnValue(new Subject<CatalogoAlojamiento[]>());

    TestBed.configureTestingModule({
      providers: [
        BusquedaAlojamientosFacade,
        {
          provide: BusquedaAlojamientosRepository,
          useValue: { listar, listarCiudades },
        },
      ],
    });

    return {
      facade: TestBed.inject(BusquedaAlojamientosFacade),
      listar,
      listarCiudades,
    };
  };

  it('consulta sin filtros cuando no se indican', () => {
    const { facade, listar } = preparar();

    facade.cargar();

    expect(listar).toHaveBeenCalledWith(0, 12, {});
  });

  it('conserva los filtros al solicitar otra página', () => {
    const { facade, listar } = preparar();
    const filtros = { idCiudad: 3, huespedes: 4 };

    facade.cargar(0, filtros);
    facade.cargar(1);

    expect(listar).toHaveBeenCalledWith(0, 12, filtros);
    expect(listar).toHaveBeenCalledWith(1, 12, filtros);
  });

  it('reemplaza los filtros al realizar una nueva búsqueda', () => {
    const { facade, listar } = preparar();

    facade.cargar(0, { idCiudad: 3 });
    facade.cargar(0, { huespedes: 2 });

    expect(listar.calls.mostRecent().args).toEqual([0, 12, { huespedes: 2 }]);
    expect(facade.filtrosAplicados()).toEqual({ huespedes: 2 });
  });

  it('consulta el catálogo público de ciudades', () => {
    const { facade, listarCiudades } = preparar();

    facade.cargarCiudades();

    expect(listarCiudades).toHaveBeenCalledTimes(1);
    expect(facade.estadoCiudades()).toBe('cargando');
  });
});
