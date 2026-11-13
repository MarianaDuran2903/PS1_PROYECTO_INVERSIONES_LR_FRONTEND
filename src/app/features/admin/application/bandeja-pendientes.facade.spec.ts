import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import {
  InformacionMinimaIncompletaError,
  PublicacionNoEncontradaError,
  TransicionNoPermitidaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import { Pagina, Publicacion } from '@features/publicaciones/domain/models/publicacion';
import { of, Subject, throwError } from 'rxjs';
import { MotivoInvalidoError } from '../domain/errors/revision.errors';
import { PublicacionAdminRepository } from '../domain/repositories/publicacion-admin.repository';
import { BandejaPendientesFacade } from './bandeja-pendientes.facade';

/** HU-013: caso de uso "Revisar publicaciones pendientes". */
describe('BandejaPendientesFacade', () => {
  const publicacion = (id: number, titulo = `Publicación ${id}`): Publicacion => ({
    idPublicacion: id,
    idAnfitrion: 3,
    estado: 'PENDIENTE_REVISION',
    titulo,
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: 'Chapinero',
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 30000,
    reglas: 'No fumar',
  });
  const pagina = (
    contenido: Publicacion[],
    numero = 0,
    totalPaginas = 1,
    totalElementos = contenido.length,
    mensaje: string | null = null,
  ): Pagina<Publicacion> => ({
    contenido,
    pagina: numero,
    tamano: 10,
    totalElementos,
    totalPaginas,
    mensaje,
  });

  let repository: jasmine.SpyObj<PublicacionAdminRepository>;
  let confirmacion: jasmine.SpyObj<ConfirmacionService>;
  let toast: jasmine.SpyObj<ToastService>;
  let facade: BandejaPendientesFacade;

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionAdminRepository>('PublicacionAdminRepository', [
      'listarPendientes',
      'aprobar',
      'rechazar',
    ]);
    repository.listarPendientes.and.returnValue(of(pagina([publicacion(1), publicacion(2)])));
    confirmacion = jasmine.createSpyObj<ConfirmacionService>('ConfirmacionService', ['confirmar']);
    confirmacion.confirmar.and.returnValue(true);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    TestBed.configureTestingModule({
      providers: [
        BandejaPendientesFacade,
        { provide: PublicacionAdminRepository, useValue: repository },
        { provide: ConfirmacionService, useValue: confirmacion },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(BandejaPendientesFacade);
  });

  describe('carga', () => {
    it('empieza cargando y pide la primera página con 10 por página', () => {
      expect(facade.estado()).toBe('cargando');

      facade.cargar();

      expect(repository.listarPendientes).toHaveBeenCalledOnceWith(0, 10);
      expect(facade.estado()).toBe('listo');
    });

    it('expone las publicaciones en el orden que llegan, sin reordenarlas', () => {
      repository.listarPendientes.and.returnValue(
        of(pagina([publicacion(7), publicacion(3), publicacion(9)])),
      );

      facade.cargar();

      expect(facade.publicaciones().map((p) => p.idPublicacion)).toEqual([7, 3, 9]);
      expect(facade.totalElementos()).toBe(3);
      expect(facade.vacia()).toBeFalse();
    });

    it('sin pendientes queda vacía y muestra el mensaje de la API', () => {
      repository.listarPendientes.and.returnValue(
        of(pagina([], 0, 0, 0, 'No hay publicaciones pendientes de revisión')),
      );

      facade.cargar();

      expect(facade.vacia()).toBeTrue();
      expect(facade.mensajeVacio()).toBe('No hay publicaciones pendientes de revisión');
    });

    it('sin mensaje de la API usa uno de respaldo', () => {
      repository.listarPendientes.and.returnValue(of(pagina([], 0, 0, 0, null)));

      facade.cargar();

      expect(facade.mensajeVacio()).toBe('No hay publicaciones pendientes de revisión');
    });

    it('si falla queda en "error" y reintentar vuelve a pedir la misma página', () => {
      repository.listarPendientes.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      facade.cargar(2);
      expect(facade.estado()).toBe('error');

      repository.listarPendientes.and.returnValue(of(pagina([publicacion(1)], 2, 3)));
      facade.reintentar();

      expect(repository.listarPendientes).toHaveBeenCalledWith(2, 10);
      expect(facade.estado()).toBe('listo');
    });

    it('navega entre páginas y solo muestra paginación si hay más de una', () => {
      repository.listarPendientes.and.returnValue(of(pagina([publicacion(1)], 0, 3, 25)));
      facade.cargar();
      expect(facade.hayVariasPaginas()).toBeTrue();
      expect(facade.hayAnterior()).toBeFalse();
      expect(facade.haySiguiente()).toBeTrue();

      repository.listarPendientes.and.returnValue(of(pagina([publicacion(11)], 1, 3, 25)));
      facade.siguiente();
      expect(repository.listarPendientes).toHaveBeenCalledWith(1, 10);

      repository.listarPendientes.and.returnValue(of(pagina([publicacion(1)], 0, 3, 25)));
      facade.anterior();
      expect(repository.listarPendientes).toHaveBeenCalledWith(0, 10);
    });

    it('una página fuera de rango salta a la última que existe', () => {
      repository.listarPendientes.and.callFake((numero) =>
        of(numero >= 2 ? pagina([], numero, 2, 12) : pagina([publicacion(1)], numero, 2, 12)),
      );

      facade.cargar(5);

      expect(repository.listarPendientes).toHaveBeenCalledWith(5, 10);
      expect(repository.listarPendientes).toHaveBeenCalledWith(1, 10);
      expect(facade.paginaActual()).toBe(1);
    });
  });

  describe('aprobar', () => {
    beforeEach(() => facade.cargar());

    it('pide confirmación nombrando la publicación', () => {
      repository.aprobar.and.returnValue(new Subject<Publicacion>());

      facade.aprobar(2);

      expect(confirmacion.confirmar).toHaveBeenCalledOnceWith(
        '¿Aprobar «Publicación 2»? Pasará a ACTIVA y quedará disponible en la plataforma.',
      );
    });

    it('si la persona cancela, no llama al servidor', () => {
      confirmacion.confirmar.and.returnValue(false);

      facade.aprobar(2);

      expect(repository.aprobar).not.toHaveBeenCalled();
      expect(facade.ocupado()).toBeFalse();
    });

    it('mientras se aprueba marca la publicación y la acción en curso, y ignora otra decisión', () => {
      repository.aprobar.and.returnValue(new Subject<Publicacion>());

      facade.aprobar(2);
      facade.aprobar(1);

      expect(facade.ocupado()).toBeTrue();
      expect(facade.idEnCurso()).toBe(2);
      expect(facade.accionEnCurso()).toBe('aprobar');
      expect(repository.aprobar).toHaveBeenCalledOnceWith(2);
    });

    it('con éxito avisa y recarga la misma página', () => {
      repository.aprobar.and.returnValue(of(publicacion(2)));
      repository.listarPendientes.calls.reset();
      repository.listarPendientes.and.returnValue(of(pagina([publicacion(1)])));

      facade.aprobar(2);

      expect(toast.success).toHaveBeenCalledOnceWith('Publicación aprobada', 'Ya está activa.');
      expect(repository.listarPendientes).toHaveBeenCalledOnceWith(0, 10);
      expect(facade.publicaciones().map((p) => p.idPublicacion)).toEqual([1]);
      expect(facade.ocupado()).toBeFalse();
    });

    it('con falta de información deja los campos pendientes en la tarjeta, sin recargar ni avisar', () => {
      repository.aprobar.and.returnValue(
        throwError(
          () =>
            new InformacionMinimaIncompletaError(
              {
                reglas: 'Las reglas son obligatorias para solicitar la activación',
                barrioZona: 'El barrio o zona es obligatorio para solicitar la activación',
              },
              'La publicación no tiene la información mínima para activarse',
            ),
        ),
      );
      repository.listarPendientes.calls.reset();

      facade.aprobar(2);

      expect(facade.avisoDe(2)).toEqual({
        mensaje: 'La publicación no tiene la información mínima para activarse',
        pendientes: [
          { campo: 'reglas', mensaje: 'Las reglas son obligatorias para solicitar la activación' },
          {
            campo: 'barrioZona',
            mensaje: 'El barrio o zona es obligatorio para solicitar la activación',
          },
        ],
      });
      expect(facade.avisoDe(1)).toBeUndefined();
      expect(repository.listarPendientes).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(facade.publicaciones().length).toBe(2);
      expect(facade.ocupado()).toBeFalse();
    });

    it('un nuevo intento quita el aviso anterior de esa publicación', () => {
      repository.aprobar.and.returnValue(
        throwError(() => new InformacionMinimaIncompletaError({ reglas: 'Faltan las reglas' })),
      );
      facade.aprobar(2);
      expect(facade.avisoDe(2)).toBeDefined();

      repository.aprobar.and.returnValue(new Subject<Publicacion>());
      facade.aprobar(2);

      expect(facade.avisoDe(2)).toBeUndefined();
    });

    it('un 409 avisa con el mensaje del backend y recarga', () => {
      repository.aprobar.and.returnValue(
        throwError(() => new TransicionNoPermitidaError('La publicación no está pendiente')),
      );
      repository.listarPendientes.calls.reset();
      repository.listarPendientes.and.returnValue(of(pagina([publicacion(1)])));

      facade.aprobar(2);

      expect(toast.error).toHaveBeenCalledOnceWith(
        'No se pudo aprobar',
        'La publicación no está pendiente',
      );
      expect(repository.listarPendientes).toHaveBeenCalledTimes(1);
    });

    it('un 404 avisa y recarga', () => {
      repository.aprobar.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));
      repository.listarPendientes.calls.reset();

      facade.aprobar(2);

      expect(toast.error).toHaveBeenCalledOnceWith(
        'No se pudo aprobar',
        'La publicación no existe',
      );
      expect(repository.listarPendientes).toHaveBeenCalledTimes(1);
    });

    it('un error de red avisa con su mensaje y no recarga', () => {
      repository.aprobar.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      repository.listarPendientes.calls.reset();

      facade.aprobar(2);

      expect(toast.error).toHaveBeenCalledOnceWith('No se pudo aprobar', 'Sin conexión');
      expect(repository.listarPendientes).not.toHaveBeenCalled();
      expect(facade.ocupado()).toBeFalse();
    });
  });

  describe('rechazar', () => {
    beforeEach(() => facade.cargar());

    it('iniciar el rechazo abre el cuadro del motivo con la publicación elegida', () => {
      facade.iniciarRechazo(2);

      expect(facade.idARechazar()).toBe(2);
      expect(facade.tituloARechazar()).toBe('Publicación 2');
      expect(facade.errorMotivo()).toBeNull();
    });

    it('cancelar el rechazo cierra el cuadro sin llamar al servidor', () => {
      facade.iniciarRechazo(2);

      facade.cancelarRechazo();

      expect(facade.idARechazar()).toBeNull();
      expect(repository.rechazar).not.toHaveBeenCalled();
    });

    it('confirmar sin haber iniciado el rechazo no hace nada', () => {
      facade.confirmarRechazo('Motivo suficiente');

      expect(repository.rechazar).not.toHaveBeenCalled();
    });

    it('mientras se rechaza marca la acción en curso y no se puede cancelar', () => {
      repository.rechazar.and.returnValue(new Subject<Publicacion>());
      facade.iniciarRechazo(2);

      facade.confirmarRechazo('Las fotos no corresponden');
      facade.cancelarRechazo();

      expect(facade.accionEnCurso()).toBe('rechazar');
      expect(facade.idARechazar()).toBe(2);
      expect(repository.rechazar).toHaveBeenCalledOnceWith(2, 'Las fotos no corresponden');
    });

    it('con éxito avisa, cierra el cuadro y recarga la página', () => {
      repository.rechazar.and.returnValue(of(publicacion(2)));
      repository.listarPendientes.calls.reset();
      repository.listarPendientes.and.returnValue(of(pagina([publicacion(1)])));
      facade.iniciarRechazo(2);

      facade.confirmarRechazo('Las fotos no corresponden');

      expect(toast.success).toHaveBeenCalledOnceWith(
        'Publicación rechazada',
        'Volvió a borrador para que el Anfitrión la corrija.',
      );
      expect(facade.idARechazar()).toBeNull();
      expect(repository.listarPendientes).toHaveBeenCalledOnceWith(0, 10);
      expect(facade.ocupado()).toBeFalse();
    });

    it('con un motivo inválido deja el error en el cuadro, que sigue abierto', () => {
      repository.rechazar.and.returnValue(
        throwError(() => new MotivoInvalidoError('El motivo debe tener entre 10 y 500 caracteres')),
      );
      repository.listarPendientes.calls.reset();
      facade.iniciarRechazo(2);

      facade.confirmarRechazo('Corto corto');

      expect(facade.idARechazar()).toBe(2);
      expect(facade.errorMotivo()).toBe('El motivo debe tener entre 10 y 500 caracteres');
      expect(facade.ocupado()).toBeFalse();
      expect(repository.listarPendientes).not.toHaveBeenCalled();
    });

    it('un 409 cierra el cuadro, avisa con el mensaje del backend y recarga', () => {
      repository.rechazar.and.returnValue(
        throwError(() => new TransicionNoPermitidaError('La publicación no está pendiente')),
      );
      repository.listarPendientes.calls.reset();
      facade.iniciarRechazo(2);

      facade.confirmarRechazo('Las fotos no corresponden');

      expect(toast.error).toHaveBeenCalledOnceWith(
        'No se pudo rechazar',
        'La publicación no está pendiente',
      );
      expect(facade.idARechazar()).toBeNull();
      expect(repository.listarPendientes).toHaveBeenCalledTimes(1);
    });

    it('un error de red deja el cuadro abierto con el mensaje para reintentar', () => {
      repository.rechazar.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      facade.iniciarRechazo(2);

      facade.confirmarRechazo('Las fotos no corresponden');

      expect(facade.idARechazar()).toBe(2);
      expect(facade.errorMotivo()).toBe('Sin conexión');
    });

    it('un error desconocido deja un mensaje genérico en el cuadro', () => {
      repository.rechazar.and.returnValue(throwError(() => new Error('raro')));
      facade.iniciarRechazo(2);

      facade.confirmarRechazo('Las fotos no corresponden');

      expect(facade.errorMotivo()).toBe('Inténtalo de nuevo en unos minutos.');
    });

    it('no se puede abrir el rechazo mientras hay una aprobación en curso', () => {
      repository.aprobar.and.returnValue(new Subject<Publicacion>());
      facade.aprobar(1);

      facade.iniciarRechazo(2);

      expect(facade.idARechazar()).toBeNull();
    });
  });
});
