import { TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { CalendarioDisponibilidadFacade } from './calendario-disponibilidad.facade';
import { CalendarioDisponibilidadRepository } from '../domain/repositories/calendario-disponibilidad.repository';

describe('CalendarioDisponibilidadFacade', () => {
  let facade: CalendarioDisponibilidadFacade;
  let repository: jasmine.SpyObj<CalendarioDisponibilidadRepository>;

  beforeEach(() => {
    repository = jasmine.createSpyObj<CalendarioDisponibilidadRepository>(
      'CalendarioDisponibilidadRepository',
      ['consultar', 'abrir', 'cerrar'],
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

  it('abre un periodo y vuelve a cargar el calendario', () => {
    const calendario = { idPublicacion: 12, titulo: 'Habitación', periodos: [] };
    repository.consultar.and.returnValue(of(calendario));
    repository.abrir.and.returnValue(of({}));

    facade.cargar(12);
    facade.abrirPeriodo('2026-06-10', '2026-06-13');

    expect(repository.abrir).toHaveBeenCalledOnceWith(12, '2026-06-10', '2026-06-13');
    expect(repository.consultar).toHaveBeenCalledTimes(2);
    expect(facade.calendario()).toEqual(calendario);
    expect(facade.guardando()).toBeFalse();
    expect(facade.errorApertura()).toBeNull();
  });

  it('cierra un periodo y vuelve a cargar el calendario', () => {
    const calendario = { idPublicacion: 12, titulo: 'Habitación', periodos: [] };
    repository.consultar.and.returnValue(of(calendario));
    repository.cerrar.and.returnValue(of({}));

    facade.cargar(12);
    facade.cerrarPeriodo(3);

    expect(repository.cerrar).toHaveBeenCalledOnceWith(12, 3);
    expect(repository.consultar).toHaveBeenCalledTimes(2);
    expect(facade.calendario()).toEqual(calendario);
    expect(facade.guardando()).toBeFalse();
    expect(facade.errorCierre()).toBeNull();
  });

  it('muestra error si no puede cerrar el periodo', () => {
    repository.consultar.and.returnValue(
      of({ idPublicacion: 12, titulo: 'Habitación', periodos: [] }),
    );
    repository.cerrar.and.returnValue(throwError(() => new Error('Conflicto')));

    facade.cargar(12);
    facade.cerrarPeriodo(3);

    expect(facade.guardando()).toBeFalse();
    expect(facade.errorCierre()).toContain('No se pudo cerrar el periodo');
  });

  it('muestra un error si el servidor rechaza la apertura', () => {
    repository.consultar.and.returnValue(
      of({ idPublicacion: 12, titulo: 'Habitación', periodos: [] }),
    );
    repository.abrir.and.returnValue(throwError(() => new Error('Conflicto')));

    facade.cargar(12);
    facade.abrirPeriodo('2026-06-10', '2026-06-13');

    expect(facade.guardando()).toBeFalse();
    expect(facade.errorApertura()).toContain('No se pudo abrir el periodo');
  });

  it('ignora aperturas sin publicación o mientras ya está guardando', () => {
    facade.abrirPeriodo('2026-06-10', '2026-06-13');
    expect(repository.abrir).not.toHaveBeenCalled();

    repository.consultar.and.returnValue(
      of({ idPublicacion: 12, titulo: 'Habitación', periodos: [] }),
    );
    repository.abrir.and.returnValue(NEVER);
    facade.cargar(12);
    facade.abrirPeriodo('2026-06-10', '2026-06-13');
    facade.abrirPeriodo('2026-06-11', '2026-06-14');

    expect(repository.abrir).toHaveBeenCalledOnceWith(12, '2026-06-10', '2026-06-13');
    expect(facade.guardando()).toBeTrue();
  });
});
