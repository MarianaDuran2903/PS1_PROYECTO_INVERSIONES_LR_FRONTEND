import { TestBed } from '@angular/core/testing';
import { ApiError } from '@core/http/api-error';
import { of, Subject, throwError } from 'rxjs';
import {
  EstadoPublicacion,
  PaginaPublicaciones,
  PublicacionResumen,
} from '../domain/models/publicacion';
import { PublicacionRepository } from '../domain/repositories/publicacion.repository';
import { MisPublicacionesFacade, TAMANO_PAGINA } from './mis-publicaciones.facade';

describe('MisPublicacionesFacade', () => {
  const resumen = (id: number, estado: EstadoPublicacion = 'BORRADOR'): PublicacionResumen => ({
    idPublicacion: id,
    titulo: `Publicación ${id}`,
    estado,
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    capacidad: 4,
    precioNoche: 100000,
  });
  const pagina = (
    contenido: PublicacionResumen[],
    numero = 0,
    totalPaginas = 1,
    totalElementos = contenido.length,
    mensaje: string | null = null,
  ): PaginaPublicaciones => ({
    contenido,
    pagina: numero,
    tamano: TAMANO_PAGINA,
    totalElementos,
    totalPaginas,
    mensaje,
  });

  let repository: jasmine.SpyObj<PublicacionRepository>;
  let facade: MisPublicacionesFacade;

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'listarPropias',
    ]);
    repository.listarPropias.and.returnValue(of(pagina([resumen(2), resumen(1)])));
    TestBed.configureTestingModule({
      providers: [MisPublicacionesFacade, { provide: PublicacionRepository, useValue: repository }],
    });
    facade = TestBed.inject(MisPublicacionesFacade);
  });

  it('envía siempre tamano=10 y pide la página 0 al empezar', () => {
    facade.cargar();

    expect(TAMANO_PAGINA).toBe(10);
    expect(repository.listarPropias).toHaveBeenCalledOnceWith(0, 10);
  });

  it('empieza "cargando" y pasa a "listo"', () => {
    repository.listarPropias.and.returnValue(new Subject<PaginaPublicaciones>());
    facade.cargar();
    expect(facade.estado()).toBe('cargando');

    repository.listarPropias.and.returnValue(of(pagina([resumen(1)])));
    facade.cargar();

    expect(facade.estado()).toBe('listo');
  });

  it('muestra las publicaciones tal como llegan, sin reordenarlas', () => {
    repository.listarPropias.and.returnValue(of(pagina([resumen(30), resumen(5), resumen(12)])));

    facade.cargar();

    expect(facade.publicaciones().map((p) => p.idPublicacion)).toEqual([30, 5, 12]);
    expect(facade.totalElementos()).toBe(3);
  });

  it('conserva el estado vigente de cada publicación', () => {
    const estados: EstadoPublicacion[] = [
      'BORRADOR',
      'PENDIENTE_REVISION',
      'ACTIVA',
      'PAUSADA',
      'BLOQUEADA',
    ];
    repository.listarPropias.and.returnValue(of(pagina(estados.map((e, i) => resumen(i + 1, e)))));

    facade.cargar();

    expect(facade.publicaciones().map((p) => p.estado)).toEqual(estados);
  });

  describe('lista vacía', () => {
    it('usa el mensaje del backend', () => {
      repository.listarPropias.and.returnValue(
        of(pagina([], 0, 0, 0, 'No tiene publicaciones registradas')),
      );

      facade.cargar();

      expect(facade.vacia()).toBeTrue();
      expect(facade.mensajeVacio()).toBe('No tiene publicaciones registradas');
      expect(facade.publicaciones()).toEqual([]);
    });

    it('si el backend no manda mensaje, usa un texto de respaldo', () => {
      repository.listarPropias.and.returnValue(of(pagina([], 0, 0, 0, null)));

      facade.cargar();

      expect(facade.mensajeVacio()).toBe('No tiene publicaciones registradas');
    });

    it('con publicaciones no está vacía', () => {
      facade.cargar();

      expect(facade.vacia()).toBeFalse();
    });

    it('mientras carga no se considera vacía', () => {
      repository.listarPropias.and.returnValue(new Subject<PaginaPublicaciones>());

      facade.cargar();

      expect(facade.vacia()).toBeFalse();
    });
  });

  describe('paginación', () => {
    it('con una sola página no hay paginación', () => {
      facade.cargar();

      expect(facade.hayVariasPaginas()).toBeFalse();
      expect(facade.hayAnterior()).toBeFalse();
      expect(facade.haySiguiente()).toBeFalse();
    });

    it('con varias páginas la hay, y empieza en la 0', () => {
      repository.listarPropias.and.returnValue(of(pagina([resumen(1)], 0, 3, 25)));

      facade.cargar();

      expect(facade.hayVariasPaginas()).toBeTrue();
      expect(facade.totalPaginas()).toBe(3);
      expect(facade.totalElementos()).toBe(25);
      expect(facade.paginaActual()).toBe(0);
      expect(facade.hayAnterior()).toBeFalse();
      expect(facade.haySiguiente()).toBeTrue();
    });

    it('siguiente pide la página 1 y anterior vuelve a la 0', () => {
      repository.listarPropias.and.callFake((numero) =>
        of(pagina([resumen(numero + 1)], numero, 3, 25)),
      );
      facade.cargar();

      facade.siguiente();
      expect(repository.listarPropias).toHaveBeenCalledWith(1, 10);
      expect(facade.paginaActual()).toBe(1);

      facade.anterior();
      expect(repository.listarPropias).toHaveBeenCalledWith(0, 10);
      expect(facade.paginaActual()).toBe(0);
    });

    it('no pasa de la última página ni baja de la primera', () => {
      repository.listarPropias.and.callFake((numero) => of(pagina([resumen(1)], numero, 2, 15)));
      facade.cargar(1);
      repository.listarPropias.calls.reset();

      facade.siguiente();
      expect(repository.listarPropias).not.toHaveBeenCalled();

      facade.cargar(0);
      repository.listarPropias.calls.reset();
      facade.anterior();
      expect(repository.listarPropias).not.toHaveBeenCalled();
    });

    it('una página fuera de rango muestra la última que existe', () => {
      repository.listarPropias.and.callFake((numero) =>
        numero > 1 ? of(pagina([], numero, 2, 15)) : of(pagina([resumen(1)], numero, 2, 15)),
      );

      facade.cargar(5);

      expect(repository.listarPropias).toHaveBeenCalledWith(5, 10);
      expect(repository.listarPropias).toHaveBeenCalledWith(1, 10);
      expect(facade.paginaActual()).toBe(1);
      expect(facade.publicaciones().length).toBe(1);
    });

    it('una petición nueva cancela la anterior: una respuesta tardía no la pisa', () => {
      const primera = new Subject<PaginaPublicaciones>();
      const segunda = new Subject<PaginaPublicaciones>();
      repository.listarPropias.and.returnValues(primera, segunda);

      facade.cargar(0);
      facade.cargar(1);
      segunda.next(pagina([resumen(2)], 1, 2, 12));
      primera.next(pagina([resumen(1)], 0, 2, 12));

      expect(facade.paginaActual()).toBe(1);
      expect(facade.publicaciones().map((p) => p.idPublicacion)).toEqual([2]);
    });
  });

  describe('errores', () => {
    it('un fallo deja el estado en "error"', () => {
      repository.listarPropias.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );

      facade.cargar();

      expect(facade.estado()).toBe('error');
    });

    it('reintentar vuelve a pedir la misma página que falló', () => {
      repository.listarPropias.and.returnValue(
        throwError(() => new ApiError(500, 'HTTP_500', 'x')),
      );
      facade.cargar(2);
      repository.listarPropias.calls.reset();
      repository.listarPropias.and.returnValue(of(pagina([resumen(1)], 2, 3, 25)));

      facade.reintentar();

      expect(repository.listarPropias).toHaveBeenCalledOnceWith(2, 10);
      expect(facade.estado()).toBe('listo');
    });
  });
});
