import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { PublicacionNoEncontradaError } from '@features/publicaciones/domain/errors/publicacion.errors';
import { Publicacion } from '@features/publicaciones/domain/models/publicacion';
import { of, Subject, throwError } from 'rxjs';
import { PublicacionAdminRepository } from '../domain/repositories/publicacion-admin.repository';
import { DetallePublicacionAdminFacade } from './detalle-publicacion-admin.facade';

/** HU-015: el detalle de una publicación para el Administrador. */
describe('DetallePublicacionAdminFacade', () => {
  const bloqueada = {
    idPublicacion: 9,
    estado: 'BLOQUEADA',
    titulo: 'Casa',
    motivoBloqueo: 'Las fotos no corresponden',
  } as Publicacion;

  let repository: jasmine.SpyObj<PublicacionAdminRepository>;
  let toast: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;
  let facade: DetallePublicacionAdminFacade;

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionAdminRepository>('PublicacionAdminRepository', [
      'obtener',
    ]);
    repository.obtener.and.returnValue(of(bloqueada));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['error']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        DetallePublicacionAdminFacade,
        { provide: PublicacionAdminRepository, useValue: repository },
        { provide: ToastService, useValue: toast },
        { provide: Router, useValue: router },
      ],
    });
    facade = TestBed.inject(DetallePublicacionAdminFacade);
  });

  it('empieza cargando', () => {
    expect(facade.estado()).toBe('cargando');
    expect(facade.publicacion()).toBeNull();
  });

  it('pide la publicación con el id de la URL y la expone, con su motivo de bloqueo', () => {
    facade.cargar('9');

    expect(repository.obtener).toHaveBeenCalledOnceWith(9);
    expect(facade.estado()).toBe('listo');
    expect(facade.publicacion()?.motivoBloqueo).toBe('Las fotos no corresponden');
  });

  it('mientras carga está en "cargando"', () => {
    repository.obtener.and.returnValue(new Subject<Publicacion>());

    facade.cargar('9');

    expect(facade.estado()).toBe('cargando');
  });

  it('un 404 avisa "La publicación no existe" y vuelve a la gestión', () => {
    repository.obtener.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));

    facade.cargar('9');

    expect(toast.error).toHaveBeenCalledOnceWith('La publicación no existe');
    expect(router.navigate).toHaveBeenCalledOnceWith(['/admin', 'publicaciones']);
  });

  for (const id of ['abc', '0', '-3', '1.5', undefined]) {
    it(`un id inválido (${id}) cuenta como inexistente y no llama al servidor`, () => {
      facade.cargar(id);

      expect(repository.obtener).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledOnceWith('La publicación no existe');
      expect(router.navigate).toHaveBeenCalledOnceWith(['/admin', 'publicaciones']);
    });
  }

  it('un error de red queda en "error" para poder reintentar, sin salir de la pantalla', () => {
    repository.obtener.and.returnValue(
      throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
    );

    facade.cargar('9');

    expect(facade.estado()).toBe('error');
    expect(router.navigate).not.toHaveBeenCalled();

    repository.obtener.and.returnValue(of(bloqueada));
    facade.cargar('9');
    expect(facade.estado()).toBe('listo');
  });
});
