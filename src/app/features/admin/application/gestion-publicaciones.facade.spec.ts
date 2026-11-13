import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import {
  InformacionMinimaIncompletaError,
  TransicionNoPermitidaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import { Pagina, Publicacion } from '@features/publicaciones/domain/models/publicacion';
import { of, Subject, throwError } from 'rxjs';
import { PublicacionAdminRepository } from '../domain/repositories/publicacion-admin.repository';
import { DecisionesPublicacionFacade } from './decisiones-publicacion.facade';
import { GestionPublicacionesFacade, Pestana, PESTANAS } from './gestion-publicaciones.facade';

/** HU-015: la gestión de publicaciones del Administrador, una pestaña por estado. */
describe('GestionPublicacionesFacade', () => {
  const publicacion = (id: number, extra: Partial<Publicacion> = {}): Publicacion => ({
    idPublicacion: id,
    idAnfitrion: 3,
    estado: 'ACTIVA',
    titulo: `Publicación ${id}`,
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
    motivoBloqueo: null,
    ...extra,
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
  let facade: GestionPublicacionesFacade;
  let decisiones: DecisionesPublicacionFacade;

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionAdminRepository>('PublicacionAdminRepository', [
      'listarPendientes',
      'listar',
      'aprobar',
      'rechazar',
      'bloquear',
      'reactivar',
    ]);
    repository.listarPendientes.and.returnValue(of(pagina([publicacion(1), publicacion(2)])));
    repository.listar.and.returnValue(of(pagina([publicacion(3)])));
    TestBed.configureTestingModule({
      providers: [
        GestionPublicacionesFacade,
        DecisionesPublicacionFacade,
        { provide: PublicacionAdminRepository, useValue: repository },
        {
          provide: ConfirmacionService,
          useValue: jasmine.createSpyObj<ConfirmacionService>('ConfirmacionService', {
            confirmar: true,
          }),
        },
        {
          provide: ToastService,
          useValue: jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']),
        },
      ],
    });
    facade = TestBed.inject(GestionPublicacionesFacade);
    decisiones = TestBed.inject(DecisionesPublicacionFacade);
  });

  it('las pestañas son Pendientes, Activas, Pausadas, Bloqueadas y Todas, en ese orden', () => {
    expect(PESTANAS.map((p) => p.etiqueta)).toEqual([
      'Pendientes',
      'Activas',
      'Pausadas',
      'Bloqueadas',
      'Todas',
    ]);
  });

  it('empieza en Pendientes, cargando', () => {
    expect(facade.pestana()).toBe('pendientes');
    expect(facade.estado()).toBe('cargando');
  });

  describe('cada pestaña pide la lista correcta', () => {
    it('Pendientes usa listarPendientes con 10 por página', () => {
      facade.cargar();

      expect(repository.listarPendientes).toHaveBeenCalledOnceWith(0, 10);
      expect(repository.listar).not.toHaveBeenCalled();
      expect(facade.estado()).toBe('listo');
    });

    const conEstado: [Pestana, string | null][] = [
      ['activas', 'ACTIVA'],
      ['pausadas', 'PAUSADA'],
      ['bloqueadas', 'BLOQUEADA'],
      ['todas', null],
    ];
    for (const [pestana, estado] of conEstado) {
      it(`${pestana} usa listar con ${estado === null ? 'estado null (sin filtro)' : `estado ${estado}`}`, () => {
        facade.cargar();
        repository.listarPendientes.calls.reset();

        facade.seleccionar(pestana);

        expect(repository.listar).toHaveBeenCalledOnceWith(estado as never, 0, 10);
        expect(repository.listarPendientes).not.toHaveBeenCalled();
        expect(facade.pestana()).toBe(pestana);
      });
    }

    it('volver a Pendientes usa otra vez listarPendientes', () => {
      facade.cargar();
      facade.seleccionar('activas');
      repository.listarPendientes.calls.reset();

      facade.seleccionar('pendientes');

      expect(repository.listarPendientes).toHaveBeenCalledOnceWith(0, 10);
    });
  });

  describe('cambio de pestaña', () => {
    it('vuelve a la primera página', () => {
      repository.listar.and.returnValue(of(pagina([publicacion(3)], 1, 3, 25)));
      facade.cargar();
      facade.seleccionar('activas');
      expect(facade.paginaActual()).toBe(1);
      repository.listar.calls.reset();

      facade.seleccionar('pausadas');

      expect(repository.listar).toHaveBeenCalledOnceWith('PAUSADA', 0, 10);
    });

    it('cancela la petición anterior: una respuesta tardía no pisa la pestaña nueva', () => {
      const lenta = new Subject<Pagina<Publicacion>>();
      repository.listarPendientes.and.returnValue(lenta);
      repository.listar.and.returnValue(of(pagina([publicacion(77)])));

      facade.cargar();
      facade.seleccionar('activas');
      lenta.next(pagina([publicacion(1)]));

      expect(facade.publicaciones().map((p) => p.idPublicacion)).toEqual([77]);
    });
  });

  describe('lista', () => {
    it('expone las publicaciones en el orden que llegan, sin reordenarlas', () => {
      repository.listarPendientes.and.returnValue(
        of(pagina([publicacion(7), publicacion(3), publicacion(9)])),
      );

      facade.cargar();

      expect(facade.publicaciones().map((p) => p.idPublicacion)).toEqual([7, 3, 9]);
      expect(facade.totalElementos()).toBe(3);
      expect(facade.vacia()).toBeFalse();
    });

    it('sin publicaciones queda vacía y muestra el mensaje de la API', () => {
      repository.listar.and.returnValue(
        of(pagina([], 0, 0, 0, 'No hay publicaciones para mostrar')),
      );
      facade.cargar();

      facade.seleccionar('bloqueadas');

      expect(facade.vacia()).toBeTrue();
      expect(facade.mensajeVacio()).toBe('No hay publicaciones para mostrar');
    });

    it('sin mensaje de la API usa uno de respaldo', () => {
      repository.listar.and.returnValue(of(pagina([], 0, 0, 0, null)));
      facade.cargar();

      facade.seleccionar('todas');

      expect(facade.mensajeVacio()).toBe('No hay publicaciones para mostrar');
    });

    it('si falla queda en "error" y reintentar vuelve a pedir la misma pestaña y página', () => {
      repository.listar.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      facade.cargar();
      facade.seleccionar('pausadas');
      expect(facade.estado()).toBe('error');

      repository.listar.and.returnValue(of(pagina([publicacion(3)])));
      facade.reintentar();

      expect(repository.listar).toHaveBeenCalledWith('PAUSADA', 0, 10);
      expect(facade.estado()).toBe('listo');
    });

    it('con varias páginas navega con siguiente y anterior dentro de la pestaña', () => {
      repository.listar.and.returnValue(of(pagina([publicacion(3)], 0, 3, 25)));
      facade.cargar();
      facade.seleccionar('activas');
      expect(facade.hayVariasPaginas()).toBeTrue();
      expect(facade.hayAnterior()).toBeFalse();
      expect(facade.haySiguiente()).toBeTrue();

      repository.listar.and.returnValue(of(pagina([publicacion(13)], 1, 3, 25)));
      facade.siguiente();
      expect(repository.listar).toHaveBeenCalledWith('ACTIVA', 1, 10);

      repository.listar.and.returnValue(of(pagina([publicacion(3)], 0, 3, 25)));
      facade.anterior();
      expect(repository.listar).toHaveBeenCalledWith('ACTIVA', 0, 10);
    });

    it('titulo y publicación de una fila se buscan por id', () => {
      facade.cargar();

      expect(facade.tituloDe(2)).toBe('Publicación 2');
      expect(facade.publicacionDe(1)?.idPublicacion).toBe(1);
      expect(facade.tituloDe(99)).toBeNull();
      expect(facade.publicacionDe(null)).toBeNull();
    });
  });

  describe('después de una decisión', () => {
    beforeEach(() => {
      facade.cargar();
      facade.seleccionar('activas');
      repository.listar.calls.reset();
    });

    it('al terminar con éxito recarga la pestaña y la página que se estaba viendo', () => {
      repository.listar.and.returnValue(of(pagina([publicacion(3)], 1, 3, 25)));
      facade.seleccionar('pausadas');
      repository.bloquear.and.returnValue(of(publicacion(3, { estado: 'BLOQUEADA' })));
      repository.listar.calls.reset();
      decisiones.iniciarMotivo(3, 'bloquear');

      decisiones.confirmarMotivo('Las fotos no corresponden al alojamiento');

      expect(repository.listar).toHaveBeenCalledOnceWith('PAUSADA', 1, 10);
    });

    it('si el estado real era otro (409) también recarga', () => {
      repository.bloquear.and.returnValue(
        throwError(() => new TransicionNoPermitidaError('La publicación ya está bloqueada')),
      );
      decisiones.iniciarMotivo(3, 'bloquear');

      decisiones.confirmarMotivo('Las fotos no corresponden al alojamiento');

      expect(repository.listar).toHaveBeenCalledOnceWith('ACTIVA', 0, 10);
    });

    it('si falta información mínima no recarga: la fila sigue y muestra qué falta', () => {
      repository.reactivar.and.returnValue(
        throwError(() => new InformacionMinimaIncompletaError({ reglas: 'Faltan las reglas' })),
      );
      decisiones.iniciarMotivo(3, 'reactivar');

      decisiones.confirmarMotivo('Se corrigió lo reportado');

      expect(repository.listar).not.toHaveBeenCalled();
      expect(decisiones.avisoDe(3)?.pendientes).toEqual([
        { campo: 'reglas', mensaje: 'Faltan las reglas' },
      ]);
    });

    it('si falla por la red no recarga', () => {
      repository.bloquear.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      decisiones.iniciarMotivo(3, 'bloquear');

      decisiones.confirmarMotivo('Las fotos no corresponden al alojamiento');

      expect(repository.listar).not.toHaveBeenCalled();
    });
  });
});
