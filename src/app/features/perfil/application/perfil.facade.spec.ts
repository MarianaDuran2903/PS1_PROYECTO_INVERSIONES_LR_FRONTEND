import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import { Subject } from 'rxjs';
import { Perfil } from '../domain/models/perfil';
import { PerfilRepository } from '../domain/repositories/perfil.repository';
import { PerfilFacade } from './perfil.facade';

describe('PerfilFacade', () => {
  let respuesta: Subject<Perfil>;
  let repository: jasmine.SpyObj<PerfilRepository>;
  let facade: PerfilFacade;

  const perfil: Perfil = {
    idUsuario: 7,
    primerNombre: 'Ana',
    segundoNombre: null,
    primerApellido: 'Ruiz',
    segundoApellido: null,
    correo: 'ana@example.com',
    rol: 'HUESPED',
    cuentaActiva: true,
  };

  beforeEach(() => {
    respuesta = new Subject<Perfil>();
    repository = jasmine.createSpyObj<PerfilRepository>('PerfilRepository', ['consultar']);
    repository.consultar.and.returnValue(respuesta);

    TestBed.configureTestingModule({
      providers: [PerfilFacade, { provide: PerfilRepository, useValue: repository }],
    });

    facade = TestBed.inject(PerfilFacade);
  });

  it('comienza sin datos ni errores', () => {
    expect(facade.cargando()).toBeFalse();
    expect(facade.perfil()).toBeNull();
    expect(facade.error()).toBeNull();
  });

  it('carga el perfil y termina la espera', () => {
    facade.cargar();
    expect(facade.cargando()).toBeTrue();

    respuesta.next(perfil);

    expect(facade.perfil()).toEqual(perfil);
    expect(facade.cargando()).toBeFalse();
    expect(facade.error()).toBeNull();
  });

  it('evita consultas simultáneas repetidas', () => {
    facade.cargar();
    facade.cargar();

    expect(repository.consultar).toHaveBeenCalledTimes(1);
  });

  it('muestra el mensaje de un error del API', () => {
    facade.cargar();
    respuesta.error(new ApiError(0, 'NETWORK_ERROR', 'Sin conexión'));

    expect(facade.cargando()).toBeFalse();
    expect(facade.perfil()).toBeNull();
    expect(facade.error()).toBe('Sin conexión');
  });

  it('permite reintentar después de un error desconocido', () => {
    facade.cargar();
    respuesta.error(new Error('detalle técnico'));

    expect(facade.error()).toContain('No fue posible consultar');

    respuesta = new Subject<Perfil>();
    repository.consultar.and.returnValue(respuesta);
    facade.cargar();

    expect(facade.error()).toBeNull();
    respuesta.next(perfil);
    expect(facade.perfil()).toEqual(perfil);
  });
});
