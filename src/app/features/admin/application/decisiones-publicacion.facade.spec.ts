import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import {
  InformacionMinimaIncompletaError,
  PublicacionNoEncontradaError,
  TransicionNoPermitidaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import { Publicacion } from '@features/publicaciones/domain/models/publicacion';
import { of, Subject, throwError } from 'rxjs';
import { MotivoInvalidoError } from '../domain/errors/revision.errors';
import { PublicacionAdminRepository } from '../domain/repositories/publicacion-admin.repository';
import {
  AccionConMotivo,
  DecisionesPublicacionFacade,
  ResultadoDecision,
} from './decisiones-publicacion.facade';

/** HU-013 y HU-015: aprobar, rechazar, bloquear y reactivar una publicación. */
describe('DecisionesPublicacionFacade', () => {
  const publicacion = { idPublicacion: 9 } as Publicacion;
  const MOTIVO = 'Las fotos no corresponden al alojamiento';

  let repository: jasmine.SpyObj<PublicacionAdminRepository>;
  let confirmacion: jasmine.SpyObj<ConfirmacionService>;
  let toast: jasmine.SpyObj<ToastService>;
  let facade: DecisionesPublicacionFacade;
  let resultados: ResultadoDecision[];

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionAdminRepository>('PublicacionAdminRepository', [
      'aprobar',
      'rechazar',
      'bloquear',
      'reactivar',
    ]);
    for (const accion of ['aprobar', 'rechazar', 'bloquear', 'reactivar'] as const) {
      repository[accion].and.returnValue(of(publicacion));
    }
    confirmacion = jasmine.createSpyObj<ConfirmacionService>('ConfirmacionService', ['confirmar']);
    confirmacion.confirmar.and.returnValue(true);
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success', 'error']);
    TestBed.configureTestingModule({
      providers: [
        DecisionesPublicacionFacade,
        { provide: PublicacionAdminRepository, useValue: repository },
        { provide: ConfirmacionService, useValue: confirmacion },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(DecisionesPublicacionFacade);
    resultados = [];
    facade.resultado$.subscribe((r) => resultados.push(r));
  });

  const esperar = (accion: 'aprobar' | AccionConMotivo, respuesta: Subject<Publicacion>) =>
    repository[accion].and.returnValue(respuesta);

  describe('aprobar', () => {
    it('pide confirmación nombrando la publicación', () => {
      esperar('aprobar', new Subject<Publicacion>());

      facade.aprobar(9, 'Casa renovada');

      expect(confirmacion.confirmar).toHaveBeenCalledOnceWith(
        '¿Aprobar «Casa renovada»? Pasará a ACTIVA y quedará disponible en la plataforma.',
      );
    });

    it('sin título habla de "la publicación"', () => {
      facade.aprobar(9, null);

      expect(confirmacion.confirmar).toHaveBeenCalledOnceWith(
        '¿Aprobar la publicación? Pasará a ACTIVA y quedará disponible en la plataforma.',
      );
    });

    it('si la persona cancela, no llama al servidor', () => {
      confirmacion.confirmar.and.returnValue(false);

      facade.aprobar(9, 'Casa');

      expect(repository.aprobar).not.toHaveBeenCalled();
      expect(facade.ocupado()).toBeFalse();
      expect(resultados).toEqual([]);
    });

    it('con éxito avisa y emite "hecha"', () => {
      facade.aprobar(9, 'Casa');

      expect(repository.aprobar).toHaveBeenCalledOnceWith(9);
      expect(toast.success).toHaveBeenCalledOnceWith('Publicación aprobada', 'Ya está activa.');
      expect(resultados).toEqual(['hecha']);
      expect(facade.ocupado()).toBeFalse();
    });

    it('mientras se aprueba expone la publicación y la acción en curso, e ignora otra decisión', () => {
      esperar('aprobar', new Subject<Publicacion>());

      facade.aprobar(9, 'Casa');
      facade.aprobar(10, 'Otra');

      expect(facade.ocupado()).toBeTrue();
      expect(facade.idEnCurso()).toBe(9);
      expect(facade.accionEnCurso()).toBe('aprobar');
      expect(repository.aprobar).toHaveBeenCalledOnceWith(9);
    });

    it('con falta de información deja los campos pendientes en la fila y emite "incompleta"', () => {
      repository.aprobar.and.returnValue(
        throwError(
          () =>
            new InformacionMinimaIncompletaError(
              { reglas: 'Las reglas son obligatorias para solicitar la activación' },
              'La publicación no tiene la información mínima para activarse',
            ),
        ),
      );

      facade.aprobar(9, 'Casa');

      expect(facade.avisoDe(9)).toEqual({
        mensaje: 'La publicación no tiene la información mínima para activarse',
        pendientes: [
          { campo: 'reglas', mensaje: 'Las reglas son obligatorias para solicitar la activación' },
        ],
      });
      expect(facade.avisoDe(10)).toBeUndefined();
      expect(toast.error).not.toHaveBeenCalled();
      expect(resultados).toEqual(['incompleta']);
    });

    it('un nuevo intento quita el aviso anterior de esa publicación', () => {
      repository.aprobar.and.returnValue(
        throwError(() => new InformacionMinimaIncompletaError({ reglas: 'Faltan las reglas' })),
      );
      facade.aprobar(9, 'Casa');
      expect(facade.avisoDe(9)).toBeDefined();

      esperar('aprobar', new Subject<Publicacion>());
      facade.aprobar(9, 'Casa');

      expect(facade.avisoDe(9)).toBeUndefined();
    });

    it('un 409 avisa con el mensaje del backend y emite "desactualizada"', () => {
      repository.aprobar.and.returnValue(
        throwError(() => new TransicionNoPermitidaError('La publicación no está pendiente')),
      );

      facade.aprobar(9, 'Casa');

      expect(toast.error).toHaveBeenCalledOnceWith(
        'No se pudo aprobar',
        'La publicación no está pendiente',
      );
      expect(resultados).toEqual(['desactualizada']);
    });

    it('un 404 avisa y emite "desactualizada"', () => {
      repository.aprobar.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));

      facade.aprobar(9, 'Casa');

      expect(toast.error).toHaveBeenCalledOnceWith(
        'No se pudo aprobar',
        'La publicación no existe',
      );
      expect(resultados).toEqual(['desactualizada']);
    });

    it('un error de red avisa con su mensaje y emite "fallida"', () => {
      repository.aprobar.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );

      facade.aprobar(9, 'Casa');

      expect(toast.error).toHaveBeenCalledOnceWith('No se pudo aprobar', 'Sin conexión');
      expect(resultados).toEqual(['fallida']);
      expect(facade.ocupado()).toBeFalse();
    });
  });

  describe('cuadro del motivo (rechazar, bloquear y reactivar)', () => {
    it('iniciar abre el cuadro con la publicación y la acción elegidas', () => {
      facade.iniciarMotivo(9, 'bloquear');

      expect(facade.idDelDialogo()).toBe(9);
      expect(facade.accionDelDialogo()).toBe('bloquear');
      expect(facade.errorMotivo()).toBeNull();
    });

    it('cancelar cierra el cuadro sin llamar al servidor', () => {
      facade.iniciarMotivo(9, 'reactivar');

      facade.cancelarMotivo();

      expect(facade.idDelDialogo()).toBeNull();
      expect(repository.reactivar).not.toHaveBeenCalled();
    });

    it('confirmar sin haber abierto el cuadro no hace nada', () => {
      facade.confirmarMotivo(MOTIVO);

      for (const accion of ['rechazar', 'bloquear', 'reactivar'] as const) {
        expect(repository[accion]).not.toHaveBeenCalled();
      }
    });

    it('no se puede abrir el cuadro mientras hay una decisión en curso', () => {
      esperar('aprobar', new Subject<Publicacion>());
      facade.aprobar(1, 'Casa');

      facade.iniciarMotivo(9, 'bloquear');

      expect(facade.idDelDialogo()).toBeNull();
    });

    it('mientras se ejecuta no se puede cancelar el cuadro', () => {
      esperar('bloquear', new Subject<Publicacion>());
      facade.iniciarMotivo(9, 'bloquear');
      facade.confirmarMotivo(MOTIVO);

      facade.cancelarMotivo();

      expect(facade.idDelDialogo()).toBe(9);
      expect(facade.accionEnCurso()).toBe('bloquear');
    });
  });

  describe('cada acción con motivo llama a su método del repositorio', () => {
    const casos: [AccionConMotivo, string, string][] = [
      ['rechazar', 'Publicación rechazada', 'Volvió a borrador para que el Anfitrión la corrija.'],
      ['bloquear', 'Publicación bloqueada', 'Dejó de ofrecerse y el Anfitrión verá el motivo.'],
      ['reactivar', 'Publicación reactivada', 'Ya está activa.'],
    ];
    for (const [accion, titulo, detalle] of casos) {
      it(`${accion}: llama al repositorio con el motivo, avisa y emite "hecha"`, () => {
        facade.iniciarMotivo(9, accion);

        facade.confirmarMotivo(MOTIVO);

        expect(repository[accion]).toHaveBeenCalledOnceWith(9, MOTIVO);
        for (const otra of casos.map(([a]) => a).filter((a) => a !== accion)) {
          expect(repository[otra]).not.toHaveBeenCalled();
        }
        expect(toast.success).toHaveBeenCalledOnceWith(titulo, detalle);
        expect(facade.idDelDialogo()).toBeNull();
        expect(resultados).toEqual(['hecha']);
        expect(facade.ocupado()).toBeFalse();
      });

      it(`${accion}: con un motivo inválido deja el error dentro del cuadro, que sigue abierto`, () => {
        repository[accion].and.returnValue(
          throwError(
            () => new MotivoInvalidoError('El motivo debe tener entre 10 y 500 caracteres'),
          ),
        );
        facade.iniciarMotivo(9, accion);

        facade.confirmarMotivo('Corto corto');

        expect(facade.idDelDialogo()).toBe(9);
        expect(facade.accionDelDialogo()).toBe(accion);
        expect(facade.errorMotivo()).toBe('El motivo debe tener entre 10 y 500 caracteres');
        expect(facade.ocupado()).toBeFalse();
        expect(resultados).toEqual([]);
      });

      it(`${accion}: un 409 cierra el cuadro, avisa con el mensaje del backend y emite "desactualizada"`, () => {
        repository[accion].and.returnValue(
          throwError(() => new TransicionNoPermitidaError('La publicación ya está bloqueada')),
        );
        facade.iniciarMotivo(9, accion);

        facade.confirmarMotivo(MOTIVO);

        expect(toast.error).toHaveBeenCalledOnceWith(
          `No se pudo ${accion}`,
          'La publicación ya está bloqueada',
        );
        expect(facade.idDelDialogo()).toBeNull();
        expect(resultados).toEqual(['desactualizada']);
      });

      it(`${accion}: un 404 cierra el cuadro, avisa y emite "desactualizada"`, () => {
        repository[accion].and.returnValue(throwError(() => new PublicacionNoEncontradaError()));
        facade.iniciarMotivo(9, accion);

        facade.confirmarMotivo(MOTIVO);

        expect(toast.error).toHaveBeenCalledOnceWith(
          `No se pudo ${accion}`,
          'La publicación no existe',
        );
        expect(facade.idDelDialogo()).toBeNull();
        expect(resultados).toEqual(['desactualizada']);
      });

      it(`${accion}: un error de red deja el cuadro abierto con el mensaje para reintentar`, () => {
        repository[accion].and.returnValue(
          throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
        );
        facade.iniciarMotivo(9, accion);

        facade.confirmarMotivo(MOTIVO);

        expect(facade.idDelDialogo()).toBe(9);
        expect(facade.errorMotivo()).toBe('Sin conexión');
        expect(resultados).toEqual(['fallida']);
      });
    }

    it('un error desconocido deja un mensaje genérico en el cuadro', () => {
      repository.bloquear.and.returnValue(throwError(() => new Error('raro')));
      facade.iniciarMotivo(9, 'bloquear');

      facade.confirmarMotivo(MOTIVO);

      expect(facade.errorMotivo()).toBe('Inténtalo de nuevo en unos minutos.');
    });

    it('reactivar con falta de información cierra el cuadro y deja los campos en la fila', () => {
      repository.reactivar.and.returnValue(
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
      facade.iniciarMotivo(9, 'reactivar');

      facade.confirmarMotivo(MOTIVO);

      expect(facade.idDelDialogo()).toBeNull();
      expect(facade.avisoDe(9)).toEqual({
        mensaje: 'La publicación no tiene la información mínima para activarse',
        pendientes: [
          { campo: 'reglas', mensaje: 'Las reglas son obligatorias para solicitar la activación' },
          {
            campo: 'barrioZona',
            mensaje: 'El barrio o zona es obligatorio para solicitar la activación',
          },
        ],
      });
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(resultados).toEqual(['incompleta']);
    });
  });
});
