import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import {
  PublicacionNoEditableError,
  PublicacionNoEncontradaError,
} from '@features/publicaciones/domain/errors/publicacion.errors';
import {
  CatalogoItem,
  EstadoPublicacion,
  IntervencionPublicacion,
  Publicacion,
} from '@features/publicaciones/domain/models/publicacion';
import { PublicacionRepository } from '@features/publicaciones/domain/repositories/publicacion.repository';
import { of, Subject, throwError } from 'rxjs';
import { IntervencionInvalidaError } from '../domain/errors/intervencion.errors';
import { PublicacionAdminRepository } from '../domain/repositories/publicacion-admin.repository';
import { IntervenirPublicacionFacade } from './intervenir-publicacion.facade';

describe('IntervenirPublicacionFacade', () => {
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
  });
  const intervencion: IntervencionPublicacion = {
    motivo: 'Corrección de la dirección reportada',
    cambios: {
      titulo: 'Casa nueva',
      descripcion: 'Cerca del parque',
      direccionTextual: 'Calle 1',
      idCiudad: 1,
      idTipo: 2,
      capacidad: 5,
      precioNoche: 120000,
      tarifaLimpieza: 15000,
      reglas: 'No fumar',
    },
  };

  let admin: jasmine.SpyObj<PublicacionAdminRepository>;
  let catalogos: jasmine.SpyObj<PublicacionRepository>;
  let router: jasmine.SpyObj<Router>;
  let toast: ToastService;
  let facade: IntervenirPublicacionFacade;

  beforeEach(() => {
    admin = jasmine.createSpyObj<PublicacionAdminRepository>('PublicacionAdminRepository', [
      'obtener',
      'intervenir',
    ]);
    admin.obtener.and.returnValue(of(publicacion()));
    catalogos = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'ciudades',
      'tiposAlojamiento',
    ]);
    catalogos.ciudades.and.returnValue(of(ciudades));
    catalogos.tiposAlojamiento.and.returnValue(of(tipos));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    TestBed.configureTestingModule({
      providers: [
        IntervenirPublicacionFacade,
        { provide: PublicacionAdminRepository, useValue: admin },
        { provide: PublicacionRepository, useValue: catalogos },
        { provide: Router, useValue: router },
      ],
    });
    toast = TestBed.inject(ToastService);
    facade = TestBed.inject(IntervenirPublicacionFacade);
  });

  describe('cargar', () => {
    it('pide la publicación (como Administrador) y los catálogos en paralelo', () => {
      catalogos.ciudades.and.returnValue(new Subject<CatalogoItem[]>());

      facade.cargar('9');

      expect(facade.carga()).toBe('cargando');
      expect(admin.obtener).toHaveBeenCalledOnceWith(9);
      expect(catalogos.ciudades).toHaveBeenCalledTimes(1);
      expect(catalogos.tiposAlojamiento).toHaveBeenCalledTimes(1);
    });

    it('queda "listo" con la publicación y los catálogos', () => {
      facade.cargar('9');

      expect(facade.carga()).toBe('listo');
      expect(facade.publicacion()?.idAnfitrion).toBe(3);
      expect(facade.ciudades()).toEqual(ciudades);
      expect(facade.tipos()).toEqual(tipos);
    });

    for (const id of ['abc', '1.5', '-3', '0', '', undefined]) {
      it(`el id ${JSON.stringify(id)} no es válido: avisa y vuelve a /admin sin llamar al backend`, () => {
        facade.cargar(id);

        expect(admin.obtener).not.toHaveBeenCalled();
        expect(toast.toasts().some((t) => t.title === 'La publicación no existe')).toBeTrue();
        expect(router.navigate).toHaveBeenCalledWith(['/admin']);
      });
    }

    it('404: avisa y vuelve a /admin', () => {
      admin.obtener.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));

      facade.cargar('9');

      expect(toast.toasts().some((t) => t.title === 'La publicación no existe')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('403 (sin rol Administrador): lleva a "Sin permisos"', () => {
      admin.obtener.and.returnValue(throwError(() => new ApiError(403, 'HTTP_403', 'Sin permiso')));

      facade.cargar('9');

      expect(router.navigate).toHaveBeenCalledWith(['/acceso-denegado']);
      expect(facade.publicacion()).toBeNull();
    });

    it('un error de red deja "error" para reintentar, sin redirigir', () => {
      admin.obtener.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      facade.cargar('9');
      expect(facade.carga()).toBe('error');
      expect(router.navigate).not.toHaveBeenCalled();

      admin.obtener.and.returnValue(of(publicacion()));
      facade.cargar('9');

      expect(facade.carga()).toBe('listo');
    });
  });

  describe('según el estado', () => {
    const intervenibles: EstadoPublicacion[] = [
      'BORRADOR',
      'PENDIENTE_REVISION',
      'PAUSADA',
      'BLOQUEADA',
    ];

    for (const estado of intervenibles) {
      it(`${estado}: se puede intervenir`, () => {
        admin.obtener.and.returnValue(of(publicacion(estado)));

        facade.cargar('9');

        expect(facade.editable()).toBeTrue();
        expect(facade.avisoNoEditable()).toBeNull();
      });
    }

    it('ACTIVA: solo lectura con el mensaje del backend', () => {
      admin.obtener.and.returnValue(of(publicacion('ACTIVA')));

      facade.cargar('9');

      expect(facade.editable()).toBeFalse();
      expect(facade.avisoNoEditable()).toBe(
        'La publicación está activa: páusela antes de intervenirla',
      );
    });

    it('no guarda una ACTIVA', () => {
      admin.obtener.and.returnValue(of(publicacion('ACTIVA')));
      facade.cargar('9');

      facade.guardar(intervencion);

      expect(admin.intervenir).not.toHaveBeenCalled();
    });

    it('las reglas son obligatorias solo en PENDIENTE_REVISION', () => {
      admin.obtener.and.returnValue(of(publicacion('PENDIENTE_REVISION')));
      facade.cargar('9');
      expect(facade.reglasObligatorias()).toBeTrue();

      admin.obtener.and.returnValue(of(publicacion('BORRADOR')));
      facade.cargar('9');
      expect(facade.reglasObligatorias()).toBeFalse();
    });
  });

  describe('guardar', () => {
    beforeEach(() => facade.cargar('9'));

    it('con 200 guarda, avisa "Intervención registrada" y vuelve a /admin', () => {
      admin.intervenir.and.returnValue(of({ ...publicacion(), titulo: 'Casa nueva' }));

      facade.guardar(intervencion);

      expect(admin.intervenir).toHaveBeenCalledOnceWith(9, intervencion);
      expect(facade.guardadoExitoso()).toBeTrue();
      expect(facade.publicacion()?.titulo).toBe('Casa nueva');
      expect(facade.publicacion()?.estado).toBe('BORRADOR');
      expect(toast.toasts().some((t) => t.title === 'Intervención registrada')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('ignora envíos repetidos mientras hay uno en curso', () => {
      admin.intervenir.and.returnValue(new Subject<Publicacion>());

      facade.guardar(intervencion);
      facade.guardar(intervencion);

      expect(facade.enviando()).toBeTrue();
      expect(admin.intervenir).toHaveBeenCalledTimes(1);
    });

    it('400 con errores: los deja por campo, incluido el motivo, y conserva la publicación', () => {
      admin.intervenir.and.returnValue(
        throwError(
          () =>
            new IntervencionInvalidaError({
              motivo: 'El motivo debe tener entre 10 y 500 caracteres',
              capacidad: 'La capacidad debe ser un número entero mayor que 0',
            }),
        ),
      );

      facade.guardar(intervencion);

      expect(facade.guardado()).toBe('error');
      expect(facade.erroresCampo()).toEqual({
        motivo: 'El motivo debe tener entre 10 y 500 caracteres',
        capacidad: 'La capacidad debe ser un número entero mayor que 0',
      });
      expect(facade.mensajeError()).toBeTruthy();
      expect(facade.publicacion()?.titulo).toBe('Casa');
      expect(router.navigate).not.toHaveBeenCalled();
      expect(toast.toasts().some((t) => t.title === 'Intervención registrada')).toBeFalse();
    });

    it('400 sin errores: muestra el mensaje arriba del formulario', () => {
      admin.intervenir.and.returnValue(
        throwError(() => new ApiError(400, 'HTTP_400', 'El cuerpo de la petición no es válido')),
      );

      facade.guardar(intervencion);

      expect(facade.mensajeError()).toBe('El cuerpo de la petición no es válido');
      expect(facade.erroresCampo()).toEqual({});
    });

    it('409: pasa a solo lectura con el mensaje del backend', () => {
      admin.intervenir.and.returnValue(
        throwError(
          () =>
            new PublicacionNoEditableError(
              'La publicación está activa: páusela antes de intervenirla',
            ),
        ),
      );

      facade.guardar(intervencion);

      expect(facade.editable()).toBeFalse();
      expect(facade.avisoNoEditable()).toBe(
        'La publicación está activa: páusela antes de intervenirla',
      );
      expect(facade.enviando()).toBeFalse();
      facade.guardar(intervencion);
      expect(admin.intervenir).toHaveBeenCalledTimes(1);
    });

    it('404: avisa y vuelve a /admin', () => {
      admin.intervenir.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));

      facade.guardar(intervencion);

      expect(toast.toasts().some((t) => t.title === 'La publicación no existe')).toBeTrue();
      expect(router.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('403 (sin rol Administrador): lleva a "Sin permisos" y no registra nada', () => {
      admin.intervenir.and.returnValue(
        throwError(() => new ApiError(403, 'HTTP_403', 'Sin permiso')),
      );

      facade.guardar(intervencion);

      expect(router.navigate).toHaveBeenCalledWith(['/acceso-denegado']);
      expect(toast.toasts().some((t) => t.title === 'Intervención registrada')).toBeFalse();
    });

    it('un error de red muestra su mensaje y conserva todo', () => {
      admin.intervenir.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );

      facade.guardar(intervencion);

      expect(facade.mensajeError()).toBe('Sin conexión');
      expect(facade.editable()).toBeTrue();
    });

    it('un error desconocido muestra un mensaje genérico', () => {
      admin.intervenir.and.returnValue(throwError(() => new Error('boom')));

      facade.guardar(intervencion);

      expect(facade.mensajeError()).toContain('No fue posible guardar la intervención');
    });
  });
});
