import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import { Subject } from 'rxjs';
import {
  PublicacionAjenaError,
  PublicacionNoEncontradaError,
  TransicionNoPermitidaError,
} from '../domain/errors/publicacion.errors';
import { Publicacion } from '../domain/models/publicacion';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';
import { PausarPublicacionFacade, ResultadoPausa } from './pausar-publicacion.facade';

/** HU-014: caso de uso "Pausar una publicación activa". */
describe('PausarPublicacionFacade', () => {
  const pausada = { idPublicacion: 9, estado: 'PAUSADA' } as Publicacion;

  let respuesta: Subject<Publicacion>;
  let repository: jasmine.SpyObj<PublicacionRepository>;
  let confirmacion: jasmine.SpyObj<ConfirmacionService>;
  let toast: jasmine.SpyObj<ToastService>;
  let facade: PausarPublicacionFacade;
  let resultados: ResultadoPausa[];

  beforeEach(() => {
    respuesta = new Subject<Publicacion>();
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', ['pausar']);
    repository.pausar.and.returnValue(respuesta);
    confirmacion = jasmine.createSpyObj<ConfirmacionService>('ConfirmacionService', ['confirmar']);
    confirmacion.confirmar.and.returnValue(true);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    TestBed.configureTestingModule({
      providers: [
        PausarPublicacionFacade,
        { provide: PublicacionRepository, useValue: repository },
        { provide: ConfirmacionService, useValue: confirmacion },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(PausarPublicacionFacade);
    resultados = [];
    facade.resultado$.subscribe((r) => resultados.push(r));
  });

  it('pide confirmación con el texto de la historia antes de pausar', () => {
    facade.pausar(9);

    expect(confirmacion.confirmar).toHaveBeenCalledOnceWith(
      '¿Pausar la publicación? Dejará de aparecer en las búsquedas. Podrás editarla mientras esté pausada y el Administrador la revisará para reactivarla.',
    );
  });

  it('si la persona cancela, no llama al servidor ni cambia nada', () => {
    confirmacion.confirmar.and.returnValue(false);

    facade.pausar(9);

    expect(repository.pausar).not.toHaveBeenCalled();
    expect(facade.pausando()).toBeFalse();
    expect(resultados).toEqual([]);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('mientras pausa expone pausando y la publicación en curso', () => {
    facade.pausar(9);

    expect(facade.pausando()).toBeTrue();
    expect(facade.idPausando()).toBe(9);
  });

  it('ignora otra pausa mientras hay una en curso', () => {
    facade.pausar(9);
    facade.pausar(10);

    expect(repository.pausar).toHaveBeenCalledOnceWith(9);
  });

  it('con éxito avisa "Publicación pausada" y emite "pausada"', () => {
    facade.pausar(9);

    respuesta.next(pausada);

    expect(toast.success).toHaveBeenCalledOnceWith('Publicación pausada');
    expect(facade.pausando()).toBeFalse();
    expect(resultados).toEqual(['pausada']);
  });

  it('un 409 avisa con el mensaje del backend y emite "rechazada" para refrescar el estado', () => {
    facade.pausar(9);

    respuesta.error(new TransicionNoPermitidaError('La publicación ya está pausada'));

    expect(toast.error).toHaveBeenCalledOnceWith(
      'No se pudo pausar',
      'La publicación ya está pausada',
    );
    expect(resultados).toEqual(['rechazada']);
    expect(facade.pausando()).toBeFalse();
  });

  it('un 403 avisa y emite "rechazada"', () => {
    facade.pausar(9);

    respuesta.error(new PublicacionAjenaError('No puedes pausar esta publicación'));

    expect(toast.error).toHaveBeenCalledOnceWith(
      'No se pudo pausar',
      'No puedes pausar esta publicación',
    );
    expect(resultados).toEqual(['rechazada']);
  });

  it('un 404 avisa y emite "rechazada"', () => {
    facade.pausar(9);

    respuesta.error(new PublicacionNoEncontradaError());

    expect(toast.error).toHaveBeenCalledOnceWith('No se pudo pausar', 'La publicación no existe');
    expect(resultados).toEqual(['rechazada']);
  });

  it('un error de red o 5xx avisa con su mensaje y emite "fallida"', () => {
    facade.pausar(9);

    respuesta.error(new ApiError(0, 'NETWORK_ERROR', 'Sin conexión'));

    expect(toast.error).toHaveBeenCalledOnceWith('No se pudo pausar', 'Sin conexión');
    expect(resultados).toEqual(['fallida']);
    expect(facade.pausando()).toBeFalse();
  });

  it('un error desconocido avisa con un mensaje genérico', () => {
    facade.pausar(9);

    respuesta.error(new Error('raro'));

    expect(toast.error).toHaveBeenCalledOnceWith(
      'No se pudo pausar',
      'No fue posible pausar la publicación. Inténtalo de nuevo.',
    );
  });
});
