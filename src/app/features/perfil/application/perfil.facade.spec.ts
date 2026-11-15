import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import { Subject } from 'rxjs';
import { ActualizarPerfilRequest, Perfil } from '../domain/models/perfil';
import { PerfilRepository } from '../domain/repositories/perfil.repository';
import { PerfilFacade } from './perfil.facade';
import { SessionService } from '@features/auth/application/session.service';

describe('PerfilFacade', () => {
  let respuesta: Subject<Perfil>;
  let respuestaActualizacion: Subject<Perfil>;
  let repository: jasmine.SpyObj<PerfilRepository>;
  let facade: PerfilFacade;
  let session: jasmine.SpyObj<SessionService>;

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

  const cambios: ActualizarPerfilRequest = {
    primerNombre: 'Carlos',
    segundoNombre: null,
    primerApellido: 'Gómez',
    segundoApellido: 'Pérez',
  };

  beforeEach(() => {
    respuesta = new Subject<Perfil>();
    respuestaActualizacion = new Subject<Perfil>();
    repository = jasmine.createSpyObj<PerfilRepository>('PerfilRepository', [
      'consultar',
      'actualizar',
    ]);
    session = jasmine.createSpyObj<SessionService>('SessionService', ['actualizarNombrePerfil']);
    repository.consultar.and.returnValue(respuesta);
    repository.actualizar.and.returnValue(respuestaActualizacion);

    TestBed.configureTestingModule({
      providers: [
        PerfilFacade,
        { provide: PerfilRepository, useValue: repository },
        { provide: SessionService, useValue: session },
      ],
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

  it('comienza sin guardado pendiente ni errores de actualización', () => {
    expect(facade.guardando()).toBeFalse();
    expect(facade.guardado()).toBeFalse();
    expect(facade.errorGuardado()).toBeNull();
  });

  it('conserva el perfil mientras guarda y lo reemplaza al recibir éxito', () => {
    facade.cargar();
    respuesta.next(perfil);

    facade.actualizar(cambios);

    expect(repository.actualizar).toHaveBeenCalledOnceWith(cambios);
    expect(facade.guardando()).toBeTrue();
    expect(facade.guardado()).toBeFalse();
    expect(facade.perfil()).toEqual(perfil);

    const actualizado: Perfil = { ...perfil, ...cambios };
    respuestaActualizacion.next(actualizado);
    respuestaActualizacion.complete();

    expect(facade.guardando()).toBeFalse();
    expect(facade.guardado()).toBeTrue();
    expect(facade.errorGuardado()).toBeNull();
    expect(facade.perfil()).toEqual(actualizado);
  });

  it('evita enviar actualizaciones simultáneas repetidas', () => {
    facade.actualizar(cambios);
    facade.actualizar(cambios);

    expect(repository.actualizar).toHaveBeenCalledTimes(1);
  });

  it('conserva el perfil anterior cuando falla la actualización', () => {
    facade.cargar();
    respuesta.next(perfil);

    facade.actualizar(cambios);
    respuestaActualizacion.error(
      new ApiError(400, 'VALIDATION_ERROR', 'Revisa los datos enviados'),
    );

    expect(facade.guardando()).toBeFalse();
    expect(facade.guardado()).toBeFalse();
    expect(facade.errorGuardado()).toBe('Revisa los datos enviados');
    expect(facade.perfil()).toEqual(perfil);
  });

  it('permite reintentar después de un error desconocido al actualizar', () => {
    facade.actualizar(cambios);
    respuestaActualizacion.error(new Error('detalle técnico'));

    expect(facade.errorGuardado()).toContain('No fue posible actualizar');

    respuestaActualizacion = new Subject<Perfil>();
    repository.actualizar.and.returnValue(respuestaActualizacion);

    facade.actualizar(cambios);

    expect(facade.errorGuardado()).toBeNull();
    expect(facade.guardando()).toBeTrue();

    respuestaActualizacion.next({ ...perfil, ...cambios });

    expect(repository.actualizar).toHaveBeenCalledTimes(2);
    expect(facade.guardado()).toBeTrue();
    expect(facade.guardando()).toBeFalse();
  });

  it('reinicia el indicador de éxito para una nueva edición', () => {
    facade.actualizar(cambios);
    respuestaActualizacion.next({ ...perfil, ...cambios });

    expect(facade.guardado()).toBeTrue();

    facade.reiniciarGuardado();

    expect(facade.guardado()).toBeFalse();
    expect(facade.errorGuardado()).toBeNull();
  });

  it('limpia el error anterior al comenzar otra edición', () => {
    facade.actualizar(cambios);
    respuestaActualizacion.error(new Error('fallo'));

    expect(facade.errorGuardado()).not.toBeNull();

    facade.reiniciarGuardado();

    expect(facade.guardado()).toBeFalse();
    expect(facade.errorGuardado()).toBeNull();
  });

  it('sincroniza la sesión con el perfil actualizado solo tras el éxito', () => {
    facade.cargar();
    respuesta.next(perfil);

    facade.actualizar(cambios);

    expect(session.actualizarNombrePerfil).not.toHaveBeenCalled();

    const actualizado: Perfil = { ...perfil, ...cambios };
    respuestaActualizacion.next(actualizado);

    expect(session.actualizarNombrePerfil).toHaveBeenCalledOnceWith({
      idUsuario: 7,
      primerNombre: 'Carlos',
      primerApellido: 'Gómez',
    });
  });

  it('no sincroniza la sesión si la actualización falla', () => {
    facade.actualizar(cambios);

    respuestaActualizacion.error(
      new ApiError(400, 'VALIDATION_ERROR', 'Revisa los datos enviados'),
    );

    expect(session.actualizarNombrePerfil).not.toHaveBeenCalled();
  });

  it('no sincroniza la sesión al consultar el perfil', () => {
    facade.cargar();
    respuesta.next(perfil);

    expect(session.actualizarNombrePerfil).not.toHaveBeenCalled();
  });
});
