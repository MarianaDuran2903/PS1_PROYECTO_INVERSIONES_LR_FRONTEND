import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { of, Subject, throwError } from 'rxjs';
import {
  PublicacionAjenaError,
  PublicacionNoEncontradaError,
} from '../domain/errors/publicacion.errors';
import { Publicacion } from '../domain/models/publicacion';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';
import { DetallePublicacionFacade } from './detalle-publicacion.facade';

describe('DetallePublicacionFacade', () => {
  const publicacion: Publicacion = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'ACTIVA',
    titulo: 'Casa',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 1',
    barrioZona: null,
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 100000,
    tarifaLimpieza: 0,
    reglas: null,
    motivoBloqueo: null,
  };

  let repository: jasmine.SpyObj<PublicacionRepository>;
  let router: jasmine.SpyObj<Router>;
  let toast: ToastService;
  let facade: DetallePublicacionFacade;

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', ['obtener']);
    repository.obtener.and.returnValue(of(publicacion));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        DetallePublicacionFacade,
        { provide: PublicacionRepository, useValue: repository },
        { provide: Router, useValue: router },
      ],
    });
    toast = TestBed.inject(ToastService);
    facade = TestBed.inject(DetallePublicacionFacade);
  });

  it('empieza "cargando" y sin publicación', () => {
    expect(facade.estado()).toBe('cargando');
    expect(facade.publicacion()).toBeNull();
  });

  it('pide la publicación con el id de la URL y queda "listo"', () => {
    facade.cargar('9');

    expect(repository.obtener).toHaveBeenCalledOnceWith(9);
    expect(facade.estado()).toBe('listo');
    expect(facade.publicacion()?.titulo).toBe('Casa');
  });

  it('muestra el estado vigente tal como llega, sea cual sea', () => {
    repository.obtener.and.returnValue(of({ ...publicacion, estado: 'BLOQUEADA' }));

    facade.cargar('9');

    expect(facade.publicacion()?.estado).toBe('BLOQUEADA');
  });

  it('mientras carga está "cargando"', () => {
    repository.obtener.and.returnValue(new Subject<Publicacion>());

    facade.cargar('9');

    expect(facade.estado()).toBe('cargando');
  });

  for (const id of ['abc', '1.5', '-3', '0', '', undefined]) {
    it(`el id ${JSON.stringify(id)} no es válido: avisa y vuelve al listado sin llamar al backend`, () => {
      facade.cargar(id);

      expect(repository.obtener).not.toHaveBeenCalled();
      expect(toast.toasts().some((t) => t.title === 'La publicación no existe')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/anfitrion', 'publicaciones']);
    });
  }

  it('404: avisa "La publicación no existe" y vuelve al listado', () => {
    repository.obtener.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));

    facade.cargar('9');

    expect(toast.toasts().some((t) => t.title === 'La publicación no existe')).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/anfitrion', 'publicaciones']);
  });

  it('403 (de otro Anfitrión): avisa y vuelve al listado sin mostrar sus datos', () => {
    repository.obtener.and.returnValue(throwError(() => new PublicacionAjenaError()));

    facade.cargar('9');

    expect(toast.toasts().some((t) => t.title === 'No puedes ver esta publicación')).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/anfitrion', 'publicaciones']);
    expect(facade.publicacion()).toBeNull();
  });

  it('un error de red o 500 deja "error" para reintentar, sin redirigir', () => {
    repository.obtener.and.returnValue(
      throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
    );
    facade.cargar('9');
    expect(facade.estado()).toBe('error');
    expect(router.navigate).not.toHaveBeenCalled();

    repository.obtener.and.returnValue(of(publicacion));
    facade.cargar('9');

    expect(facade.estado()).toBe('listo');
  });
});
