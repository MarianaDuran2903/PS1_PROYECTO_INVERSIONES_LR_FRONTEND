import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { of, Subject, throwError } from 'rxjs';
import {
  PublicacionAjenaError,
  PublicacionInvalidaError,
  PublicacionNoEditableError,
  PublicacionNoEncontradaError,
} from '../domain/errors/publicacion.errors';
import {
  ActualizarPublicacion,
  CatalogoItem,
  EstadoPublicacion,
  Publicacion,
} from '../domain/models/publicacion';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';
import { EditarPublicacionFacade } from './editar-publicacion.facade';

describe('EditarPublicacionFacade', () => {
  const ciudades: CatalogoItem[] = [{ id: 1, nombre: 'Bogotá' }];
  const tipos: CatalogoItem[] = [{ id: 2, nombre: 'Casa' }];
  const publicacion = (estado: EstadoPublicacion = 'BORRADOR'): Publicacion => ({
    idPublicacion: 9,
    idAnfitrion: 3,
    estado,
    titulo: 'Casa',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 1',
    barrioZona: null,
    ciudad: ciudades[0],
    tipo: tipos[0],
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 100000,
    tarifaLimpieza: 0,
    reglas: null,
    motivoBloqueo: null,
  });
  const datos: ActualizarPublicacion = {
    titulo: 'Casa nueva',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 1',
    idCiudad: 1,
    idTipo: 2,
    capacidad: 5,
    precioNoche: 120000,
    tarifaLimpieza: 15000,
    reglas: 'No fumar',
  };

  let repository: jasmine.SpyObj<PublicacionRepository>;
  let toast: ToastService;
  let router: jasmine.SpyObj<Router>;
  let facade: EditarPublicacionFacade;

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'ciudades',
      'tiposAlojamiento',
      'obtener',
      'actualizar',
    ]);
    repository.ciudades.and.returnValue(of(ciudades));
    repository.tiposAlojamiento.and.returnValue(of(tipos));
    repository.obtener.and.returnValue(of(publicacion()));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);

    TestBed.configureTestingModule({
      providers: [
        EditarPublicacionFacade,
        { provide: PublicacionRepository, useValue: repository },
        { provide: Router, useValue: router },
      ],
    });
    toast = TestBed.inject(ToastService);
    facade = TestBed.inject(EditarPublicacionFacade);
  });

  describe('cargar', () => {
    it('pide la publicación y los catálogos en paralelo', () => {
      repository.ciudades.and.returnValue(new Subject<CatalogoItem[]>());

      facade.cargar('9');

      expect(facade.carga()).toBe('cargando');
      expect(repository.ciudades).toHaveBeenCalledTimes(1);
      expect(repository.tiposAlojamiento).toHaveBeenCalledTimes(1);
      expect(repository.obtener).toHaveBeenCalledOnceWith(9);
    });

    it('queda "listo" con la publicación y los catálogos', () => {
      facade.cargar('9');

      expect(facade.carga()).toBe('listo');
      expect(facade.publicacion()?.titulo).toBe('Casa');
      expect(facade.ciudades()).toEqual(ciudades);
      expect(facade.tipos()).toEqual(tipos);
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

    it('403: avisa "No puedes editar esta publicación" y vuelve al listado', () => {
      repository.obtener.and.returnValue(throwError(() => new PublicacionAjenaError()));

      facade.cargar('9');

      expect(
        toast.toasts().some((t) => t.title === 'No puedes editar esta publicación'),
      ).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/anfitrion', 'publicaciones']);
    });

    it('un error de red o 500 deja "error" para poder reintentar, sin redirigir', () => {
      repository.obtener.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      facade.cargar('9');
      expect(facade.carga()).toBe('error');
      expect(router.navigate).not.toHaveBeenCalled();

      repository.obtener.and.returnValue(of(publicacion()));
      facade.cargar('9');

      expect(facade.carga()).toBe('listo');
    });
  });

  describe('según el estado', () => {
    const casos: [EstadoPublicacion, boolean, string | null][] = [
      ['BORRADOR', true, null],
      ['PAUSADA', true, null],
      ['ACTIVA', false, 'Esta publicación está activa. Para editarla, páusala primero.'],
      ['PENDIENTE_REVISION', false, 'La publicación está en revisión del Administrador.'],
      ['BLOQUEADA', false, 'La publicación está bloqueada.'],
    ];

    for (const [estado, editable, aviso] of casos) {
      it(`${estado}: ${editable ? 'editable' : 'solo lectura con aviso'}`, () => {
        repository.obtener.and.returnValue(of(publicacion(estado)));

        facade.cargar('9');

        expect(facade.editable()).toBe(editable);
        expect(facade.avisoNoEditable()).toBe(aviso);
      });
    }

    it('no guarda si el estado no permite editar', () => {
      repository.obtener.and.returnValue(of(publicacion('ACTIVA')));
      facade.cargar('9');

      facade.guardar(datos);

      expect(repository.actualizar).not.toHaveBeenCalled();
    });
  });

  describe('guardar', () => {
    beforeEach(() => facade.cargar('9'));

    it('con 200 guarda, avisa "Cambios guardados", actualiza la publicación y vuelve al listado', () => {
      repository.actualizar.and.returnValue(of({ ...publicacion(), titulo: 'Casa nueva' }));

      facade.guardar(datos);

      expect(repository.actualizar).toHaveBeenCalledOnceWith(9, datos);
      expect(facade.guardadoExitoso()).toBeTrue();
      expect(facade.publicacion()?.titulo).toBe('Casa nueva');
      expect(facade.publicacion()?.estado).toBe('BORRADOR');
      expect(toast.toasts().some((t) => t.title === 'Cambios guardados')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/anfitrion', 'publicaciones']);
    });

    it('ignora envíos repetidos mientras hay uno en curso', () => {
      repository.actualizar.and.returnValue(new Subject<Publicacion>());

      facade.guardar(datos);
      facade.guardar(datos);

      expect(facade.enviando()).toBeTrue();
      expect(repository.actualizar).toHaveBeenCalledTimes(1);
    });

    it('400 con errores: los deja por campo y conserva la publicación cargada', () => {
      repository.actualizar.and.returnValue(
        throwError(
          () =>
            new PublicacionInvalidaError({
              capacidad: 'La capacidad debe ser un número entero mayor que 0',
            }),
        ),
      );

      facade.guardar(datos);

      expect(facade.guardado()).toBe('error');
      expect(facade.erroresCampo()).toEqual({
        capacidad: 'La capacidad debe ser un número entero mayor que 0',
      });
      expect(facade.mensajeError()).toBeTruthy();
      expect(facade.publicacion()?.titulo).toBe('Casa');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('400 sin errores: muestra el mensaje arriba del formulario', () => {
      repository.actualizar.and.returnValue(
        throwError(() => new ApiError(400, 'HTTP_400', 'El cuerpo de la petición no es válido')),
      );

      facade.guardar(datos);

      expect(facade.mensajeError()).toBe('El cuerpo de la petición no es válido');
      expect(facade.erroresCampo()).toEqual({});
    });

    it('409: pasa a solo lectura con el mensaje del backend', () => {
      repository.actualizar.and.returnValue(
        throwError(
          () =>
            new PublicacionNoEditableError(
              'La publicación está activa: solicite pausarla para editarla',
            ),
        ),
      );

      facade.guardar(datos);

      expect(facade.editable()).toBeFalse();
      expect(facade.avisoNoEditable()).toBe(
        'La publicación está activa: solicite pausarla para editarla',
      );
      expect(facade.enviando()).toBeFalse();
      facade.guardar(datos);
      expect(repository.actualizar).toHaveBeenCalledTimes(1);
    });

    it('403: avisa y vuelve al listado', () => {
      repository.actualizar.and.returnValue(throwError(() => new PublicacionAjenaError()));

      facade.guardar(datos);

      expect(
        toast.toasts().some((t) => t.title === 'No puedes editar esta publicación'),
      ).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/anfitrion', 'publicaciones']);
    });

    it('404: avisa y vuelve al listado', () => {
      repository.actualizar.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));

      facade.guardar(datos);

      expect(toast.toasts().some((t) => t.title === 'La publicación no existe')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/anfitrion', 'publicaciones']);
    });

    it('un error de red muestra su mensaje y conserva todo', () => {
      repository.actualizar.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );

      facade.guardar(datos);

      expect(facade.mensajeError()).toBe('Sin conexión');
      expect(facade.editable()).toBeTrue();
      expect(facade.guardado()).toBe('error');
    });

    it('un error desconocido muestra un mensaje genérico', () => {
      repository.actualizar.and.returnValue(throwError(() => new Error('boom')));

      facade.guardar(datos);

      expect(facade.mensajeError()).toContain('No fue posible guardar los cambios');
    });
  });
});
