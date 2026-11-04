import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { of, Subject, throwError } from 'rxjs';
import { PublicacionInvalidaError } from '../domain/errors/publicacion.errors';
import { CatalogoItem, NuevaPublicacion, Publicacion } from '../domain/models/publicacion';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';
import { CrearPublicacionFacade } from './crear-publicacion.facade';

describe('CrearPublicacionFacade', () => {
  const ciudades: CatalogoItem[] = [{ id: 1, nombre: 'Bogotá' }];
  const tipos: CatalogoItem[] = [{ id: 2, nombre: 'Apartamento' }];
  const datos: NuevaPublicacion = {
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    idCiudad: 1,
    idTipo: 2,
    capacidad: 4,
    precioNoche: 250000,
  };
  const publicacion: Publicacion = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'BORRADOR',
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: null,
    ciudad: ciudades[0],
    tipo: tipos[0],
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 0,
  };

  let repository: jasmine.SpyObj<PublicacionRepository>;
  let toast: jasmine.SpyObj<ToastService>;
  let facade: CrearPublicacionFacade;

  const crearFacade = () => {
    TestBed.configureTestingModule({
      providers: [
        CrearPublicacionFacade,
        { provide: PublicacionRepository, useValue: repository },
        { provide: ToastService, useValue: toast },
      ],
    });
    facade = TestBed.inject(CrearPublicacionFacade);
  };

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'ciudades',
      'tiposAlojamiento',
      'crear',
    ]);
    repository.ciudades.and.returnValue(of(ciudades));
    repository.tiposAlojamiento.and.returnValue(of(tipos));
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success']);
  });

  describe('catálogos', () => {
    it('empieza en "cargando" y pide ciudades y tipos al mismo tiempo', () => {
      const ciudadesPendientes = new Subject<CatalogoItem[]>();
      const tiposPendientes = new Subject<CatalogoItem[]>();
      repository.ciudades.and.returnValue(ciudadesPendientes);
      repository.tiposAlojamiento.and.returnValue(tiposPendientes);
      crearFacade();

      facade.cargarCatalogos();

      expect(facade.catalogos()).toBe('cargando');
      expect(repository.ciudades).toHaveBeenCalledTimes(1);
      expect(repository.tiposAlojamiento).toHaveBeenCalledTimes(1);
    });

    it('queda "listo" con los dos catálogos cargados', () => {
      crearFacade();

      facade.cargarCatalogos();

      expect(facade.catalogos()).toBe('listo');
      expect(facade.ciudades()).toEqual(ciudades);
      expect(facade.tipos()).toEqual(tipos);
    });

    it('si falla uno queda en "error" y se puede reintentar', () => {
      repository.tiposAlojamiento.and.returnValue(
        throwError(() => new ApiError(500, 'HTTP_500', 'Error')),
      );
      crearFacade();
      facade.cargarCatalogos();
      expect(facade.catalogos()).toBe('error');

      repository.tiposAlojamiento.and.returnValue(of(tipos));
      facade.cargarCatalogos();

      expect(facade.catalogos()).toBe('listo');
      expect(repository.ciudades).toHaveBeenCalledTimes(2);
    });
  });

  describe('crear', () => {
    beforeEach(() => crearFacade());

    it('guarda la publicación, avisa y deja el estado BORRADOR disponible', () => {
      repository.crear.and.returnValue(of(publicacion));

      facade.crear(datos);

      expect(repository.crear).toHaveBeenCalledOnceWith(datos);
      expect(facade.guardado()).toBe('exitoso');
      expect(facade.publicacion()?.estado).toBe('BORRADOR');
      expect(toast.success).toHaveBeenCalledOnceWith('Publicación guardada como borrador');
    });

    it('ignora envíos repetidos mientras hay uno en curso', () => {
      repository.crear.and.returnValue(new Subject<Publicacion>());

      facade.crear(datos);
      facade.crear(datos);

      expect(facade.enviando()).toBeTrue();
      expect(repository.crear).toHaveBeenCalledTimes(1);
    });

    it('expone los errores de un 400 por campo', () => {
      repository.crear.and.returnValue(
        throwError(() => new PublicacionInvalidaError({ idCiudad: 'La ciudad no existe' })),
      );

      facade.crear(datos);

      expect(facade.guardado()).toBe('error');
      expect(facade.erroresCampo()).toEqual({ idCiudad: 'La ciudad no existe' });
      expect(facade.mensajeError()).toBeTruthy();
      expect(facade.publicacion()).toBeNull();
      expect(toast.success).not.toHaveBeenCalled();
    });

    it('muestra el mensaje de un ApiError (p. ej. 403) sin errores por campo', () => {
      repository.crear.and.returnValue(
        throwError(() => new ApiError(403, 'HTTP_403', 'No tiene permisos para esta operación')),
      );

      facade.crear(datos);

      expect(facade.mensajeError()).toBe('No tiene permisos para esta operación');
      expect(facade.erroresCampo()).toEqual({});
    });

    it('un error desconocido muestra un mensaje genérico', () => {
      repository.crear.and.returnValue(throwError(() => new Error('boom')));

      facade.crear(datos);

      expect(facade.mensajeError()).toContain('No fue posible guardar la publicación');
    });

    it('crearOtra vuelve al formulario vacío sin perder los catálogos', () => {
      repository.crear.and.returnValue(of(publicacion));
      facade.cargarCatalogos();
      facade.crear(datos);

      facade.crearOtra();

      expect(facade.publicacion()).toBeNull();
      expect(facade.guardado()).toBe('inactivo');
      expect(facade.ciudades()).toEqual(ciudades);
    });
  });
});
