import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CalendarioDisponibilidadFacade } from './calendario-disponibilidad.facade';
import { CalendarioDisponibilidadRepository } from '../domain/repositories/calendario-disponibilidad.repository';

describe('CalendarioDisponibilidadFacade', () => {
  let facade: CalendarioDisponibilidadFacade;
  let repository: jasmine.SpyObj<CalendarioDisponibilidadRepository>;

  beforeEach(() => {
    repository = jasmine.createSpyObj<CalendarioDisponibilidadRepository>(
      'CalendarioDisponibilidadRepository',
      ['consultar'],
    );

    TestBed.configureTestingModule({
      providers: [
        CalendarioDisponibilidadFacade,
        { provide: CalendarioDisponibilidadRepository, useValue: repository },
      ],
    });
    facade = TestBed.inject(CalendarioDisponibilidadFacade);
  });

  it('rechaza un identificador inválido y no permite reintentar sin una publicación válida', () => {
    facade.cargar(0);

    expect(facade.estado()).toBe('error');
    expect(facade.calendario()).toBeNull();
    expect(repository.consultar).not.toHaveBeenCalled();

    facade.reintentar();

    expect(repository.consultar).not.toHaveBeenCalled();
  });

  it('marca error si falla la consulta y permite reintentar la misma publicación', () => {
    repository.consultar.and.returnValue(throwError(() => new Error('Error de red')));

    facade.cargar(12);

    expect(facade.estado()).toBe('error');
    expect(facade.calendario()).toBeNull();
    expect(repository.consultar).toHaveBeenCalledOnceWith(12);

    facade.reintentar();

    expect(repository.consultar).toHaveBeenCalledTimes(2);
    expect(repository.consultar).toHaveBeenCalledWith(12);
  });

  it('indica que el calendario está vacío cuando la consulta no devuelve periodos', () => {
    repository.consultar.and.returnValue(
      of({ idPublicacion: 12, titulo: 'Habitación', periodos: [] }),
    );

    facade.cargar(12);

    expect(facade.estado()).toBe('listo');
    expect(facade.sinPeriodos()).toBeTrue();
  });
});
