import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { of, Subject, throwError } from 'rxjs';
import {
  EstadoPublicacion,
  PaginaPublicaciones,
  PublicacionResumen,
} from '../../../domain/models/publicacion';
import { PublicacionRepository } from '../../../domain/repositories/publicacion.repository';
import { MisPublicacionesPageComponent } from './mis-publicaciones-page.component';

describe('MisPublicacionesPageComponent', () => {
  const resumen = (
    id: number,
    estado: EstadoPublicacion = 'BORRADOR',
    extra: Partial<PublicacionResumen> = {},
  ): PublicacionResumen => ({
    idPublicacion: id,
    titulo: `Publicación ${id}`,
    estado,
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    capacidad: 4,
    precioNoche: 250000,
    ...extra,
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
    tamano: 10,
    totalElementos,
    totalPaginas,
    mensaje,
  });

  let fixture: ComponentFixture<MisPublicacionesPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<PublicacionRepository>;

  const crearPagina = () => {
    fixture = TestBed.createComponent(MisPublicacionesPageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  };
  const tarjetas = () => Array.from(element.querySelectorAll<HTMLElement>('.tarjeta'));
  const texto = (selector: string) => element.querySelector(selector)?.textContent?.trim();
  const boton = (nombre: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(nombre),
    )!;

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'listarPropias',
    ]);
    repository.listarPropias.and.returnValue(of(pagina([resumen(2), resumen(1)])));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PublicacionRepository, useValue: repository }],
    });
  });

  describe('carga', () => {
    it('pide la primera página con 10 por página al abrir', () => {
      crearPagina();

      expect(repository.listarPropias).toHaveBeenCalledOnceWith(0, 10);
    });

    it('muestra un indicador mientras carga', () => {
      repository.listarPropias.and.returnValue(new Subject<PaginaPublicaciones>());

      crearPagina();

      expect(texto('[role="status"]')).toContain('Cargando');
      expect(tarjetas().length).toBe(0);
    });

    it('si falla muestra un mensaje con "Reintentar", y al reintentar muestra la lista', () => {
      repository.listarPropias.and.returnValue(
        throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
      );
      crearPagina();
      expect(texto('[role="alert"]')).toContain('No fue posible cargar tus publicaciones');

      repository.listarPropias.and.returnValue(of(pagina([resumen(1)])));
      boton('Reintentar').click();
      fixture.detectChanges();

      expect(tarjetas().length).toBe(1);
      expect(element.querySelector('[role="alert"]')).toBeNull();
    });
  });

  describe('lista', () => {
    it('muestra una tarjeta por publicación, en el orden que llega del backend', () => {
      repository.listarPropias.and.returnValue(of(pagina([resumen(30), resumen(5), resumen(12)])));

      crearPagina();

      expect(
        tarjetas().map((t) => t.querySelector('.tarjeta__titulo')!.textContent!.trim()),
      ).toEqual(['Publicación 30', 'Publicación 5', 'Publicación 12']);
      expect(texto('.total')).toBe('3 publicaciones');
    });

    it('cada tarjeta muestra tipo, ciudad, capacidad y el precio en pesos', () => {
      repository.listarPropias.and.returnValue(
        of(pagina([resumen(1, 'ACTIVA', { capacidad: 1, tipo: { id: 3, nombre: 'Cabaña' } })])),
      );

      crearPagina();

      const tarjeta = tarjetas()[0];
      expect(tarjeta.querySelector('.tarjeta__meta')!.textContent).toContain('Cabaña');
      expect(tarjeta.querySelector('.tarjeta__meta')!.textContent).toContain('Bogotá');
      expect(tarjeta.querySelector('.tarjeta__meta')!.textContent).toContain('1 huésped');
      expect(tarjeta.querySelector('.tarjeta__precio')!.textContent).toMatch(/250\.000/);
      expect(tarjeta.querySelector('.tarjeta__precio')!.textContent).toContain('por noche');
    });

    it('usa el icono del tipo de alojamiento y no muestra imágenes', () => {
      repository.listarPropias.and.returnValue(
        of(pagina([resumen(1, 'BORRADOR', { tipo: { id: 3, nombre: 'Cabaña' } })])),
      );

      crearPagina();

      expect(tarjetas()[0].querySelector('svg')!.getAttribute('data-icono')).toBe('cabana');
      expect(element.querySelector('img')).toBeNull();
    });

    it('con una sola publicación usa el singular', () => {
      repository.listarPropias.and.returnValue(of(pagina([resumen(1)])));

      crearPagina();

      expect(texto('.total')).toBe('1 publicación');
    });

    it('tiene el botón "Nueva publicación"', () => {
      crearPagina();

      const enlace = element.querySelector<HTMLAnchorElement>('.pagina__encabezado a')!;
      expect(enlace.textContent!.trim()).toBe('Nueva publicación');
      expect(enlace.getAttribute('href')).toBe('/anfitrion/publicaciones/nueva');
    });
  });

  describe('abrir el detalle', () => {
    it('el título de cada tarjeta es un enlace al detalle de esa publicación', () => {
      repository.listarPropias.and.returnValue(of(pagina([resumen(30), resumen(5)])));

      crearPagina();

      const enlaces = tarjetas().map((t) =>
        t.querySelector<HTMLAnchorElement>('.tarjeta__titulo a')!.getAttribute('href'),
      );
      expect(enlaces).toEqual(['/anfitrion/publicaciones/30', '/anfitrion/publicaciones/5']);
    });

    it('el enlace tiene como texto el título de la publicación', () => {
      repository.listarPropias.and.returnValue(of(pagina([resumen(7)])));

      crearPagina();

      expect(tarjetas()[0].querySelector('.tarjeta__titulo a')!.textContent!.trim()).toBe(
        'Publicación 7',
      );
    });

    it('"Editar" sigue siendo un enlace aparte, hacia la edición y no hacia el detalle', () => {
      repository.listarPropias.and.returnValue(of(pagina([resumen(7, 'BORRADOR')])));

      crearPagina();

      const tarjeta = tarjetas()[0];
      expect(tarjeta.querySelector('app-boton-editar-publicacion a')!.getAttribute('href')).toBe(
        '/anfitrion/publicaciones/7/editar',
      );
      expect(tarjeta.querySelectorAll('a').length).toBe(2);
    });

    it('cada tarjeta tiene un solo enlace de detalle', () => {
      repository.listarPropias.and.returnValue(of(pagina([resumen(1), resumen(2), resumen(3)])));

      crearPagina();

      for (const tarjeta of tarjetas()) {
        expect(tarjeta.querySelectorAll('.tarjeta__titulo a').length).toBe(1);
      }
    });
  });

  describe('estado de cada publicación', () => {
    const etiquetas: Record<EstadoPublicacion, string> = {
      BORRADOR: 'Borrador',
      PENDIENTE_REVISION: 'Pendiente de revisión',
      ACTIVA: 'Activa',
      PAUSADA: 'Pausada',
      BLOQUEADA: 'Bloqueada',
    };

    it('muestra el estado vigente de cada una con su etiqueta de color', () => {
      const estados = Object.keys(etiquetas) as EstadoPublicacion[];
      repository.listarPropias.and.returnValue(
        of(pagina(estados.map((estado, i) => resumen(i + 1, estado)))),
      );

      crearPagina();

      const mostradas = tarjetas().map((t) => {
        const etiqueta = t.querySelector<HTMLElement>('app-estado-publicacion')!;
        return [etiqueta.textContent!.trim(), etiqueta.className] as const;
      });
      expect(mostradas.map(([texto]) => texto)).toEqual(estados.map((e) => etiquetas[e]));
      expect(new Set(mostradas.map(([, clase]) => clase)).size).toBe(5);
    });

    it('"Editar" está activo solo en BORRADOR y PAUSADA', () => {
      const estados = Object.keys(etiquetas) as EstadoPublicacion[];
      repository.listarPropias.and.returnValue(
        of(pagina(estados.map((estado, i) => resumen(i + 1, estado)))),
      );

      crearPagina();

      const activos = tarjetas().map(
        (t) => t.querySelector('app-boton-editar-publicacion a') !== null,
      );
      expect(activos).toEqual(estados.map((e) => e === 'BORRADOR' || e === 'PAUSADA'));
    });

    it('"Editar" lleva a la edición de esa publicación', () => {
      repository.listarPropias.and.returnValue(of(pagina([resumen(42, 'PAUSADA')])));

      crearPagina();

      const enlace = tarjetas()[0].querySelector<HTMLAnchorElement>(
        'app-boton-editar-publicacion a',
      )!;
      expect(enlace.textContent!.trim()).toBe('Editar');
      expect(enlace.getAttribute('href')).toBe('/anfitrion/publicaciones/42/editar');
    });

    it('en los demás estados "Editar" está deshabilitado con un tooltip que explica el motivo', () => {
      repository.listarPropias.and.returnValue(
        of(
          pagina([resumen(1, 'ACTIVA'), resumen(2, 'PENDIENTE_REVISION'), resumen(3, 'BLOQUEADA')]),
        ),
      );

      crearPagina();

      const botones = tarjetas().map((t) =>
        t.querySelector<HTMLButtonElement>('app-boton-editar-publicacion button')!,
      );
      expect(botones.map((b) => b.getAttribute('aria-disabled'))).toEqual(['true', 'true', 'true']);
      expect(botones.map((b) => b.getAttribute('title'))).toEqual([
        'Esta publicación está activa. Para editarla, páusala primero.',
        'La publicación está en revisión del Administrador.',
        'La publicación está bloqueada.',
      ]);
    });
  });

  describe('sin publicaciones', () => {
    beforeEach(() => {
      repository.listarPropias.and.returnValue(
        of(pagina([], 0, 0, 0, 'No tiene publicaciones registradas')),
      );
      crearPagina();
    });

    it('informa con el mensaje del backend y no muestra tarjetas', () => {
      expect(texto('.vacio__mensaje')).toBe('No tiene publicaciones registradas');
      expect(tarjetas().length).toBe(0);
      expect(element.querySelector('.total')).toBeNull();
    });

    it('ofrece el botón "Crear publicación"', () => {
      const enlace = element.querySelector<HTMLAnchorElement>('.vacio a')!;

      expect(enlace.textContent!.trim()).toBe('Crear publicación');
      expect(enlace.getAttribute('href')).toBe('/anfitrion/publicaciones/nueva');
    });

    it('no muestra la paginación', () => {
      expect(element.querySelector('.paginacion')).toBeNull();
    });
  });

  describe('paginación', () => {
    it('se oculta si hay una sola página', () => {
      crearPagina();

      expect(element.querySelector('.paginacion')).toBeNull();
    });

    it('con varias páginas muestra "Página 1 de 3" y Anterior deshabilitado', () => {
      repository.listarPropias.and.returnValue(of(pagina([resumen(1)], 0, 3, 25)));

      crearPagina();

      expect(texto('.paginacion__texto')).toBe('Página 1 de 3');
      expect(boton('Anterior').disabled).toBeTrue();
      expect(boton('Siguiente').disabled).toBeFalse();
      expect(texto('.total')).toBe('25 publicaciones');
    });

    it('Siguiente pide la página 1 y Anterior vuelve a la 0', () => {
      repository.listarPropias.and.callFake((numero) =>
        of(pagina([resumen(numero + 1)], numero, 3, 25)),
      );
      crearPagina();

      boton('Siguiente').click();
      fixture.detectChanges();

      expect(repository.listarPropias).toHaveBeenCalledWith(1, 10);
      expect(texto('.paginacion__texto')).toBe('Página 2 de 3');
      expect(boton('Anterior').disabled).toBeFalse();

      boton('Anterior').click();
      fixture.detectChanges();

      expect(repository.listarPropias).toHaveBeenCalledWith(0, 10);
      expect(texto('.paginacion__texto')).toBe('Página 1 de 3');
    });

    it('en la última página Siguiente queda deshabilitado', () => {
      repository.listarPropias.and.callFake((numero) =>
        of(pagina([resumen(numero + 1)], numero, 2, 15)),
      );
      crearPagina();

      boton('Siguiente').click();
      fixture.detectChanges();

      expect(boton('Siguiente').disabled).toBeTrue();
    });
  });
});
