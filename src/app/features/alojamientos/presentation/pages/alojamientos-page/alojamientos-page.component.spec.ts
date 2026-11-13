import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import {
  PaginaPublicaciones,
  PublicacionResumen,
} from '@features/publicaciones/domain/models/publicacion';
import { of, Subject, throwError } from 'rxjs';
import { AlojamientoRepository } from '../../../domain/repositories/alojamiento.repository';
import { AlojamientosPageComponent } from './alojamientos-page.component';

/** HU-014: el listado público de alojamientos disponibles. */
describe('AlojamientosPageComponent', () => {
  const alojamiento = (
    id: number,
    extra: Partial<PublicacionResumen> = {},
  ): PublicacionResumen => ({
    idPublicacion: id,
    titulo: `Alojamiento ${id}`,
    estado: 'ACTIVA',
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
    mensaje: string | null = null,
  ): PaginaPublicaciones => ({
    contenido,
    pagina: numero,
    tamano: 10,
    totalElementos: contenido.length,
    totalPaginas,
    mensaje,
  });

  let fixture: ComponentFixture<AlojamientosPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<AlojamientoRepository>;

  const tarjetas = () => Array.from(element.querySelectorAll<HTMLElement>('.tarjeta'));
  const boton = (nombre: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(nombre),
    )!;
  const crear = () => {
    fixture = TestBed.createComponent(AlojamientosPageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(() => {
    repository = jasmine.createSpyObj<AlojamientoRepository>('AlojamientoRepository', ['listar']);
    repository.listar.and.returnValue(of(pagina([alojamiento(2), alojamiento(1)])));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AlojamientoRepository, useValue: repository }],
    });
  });

  it('pide la primera página con 10 por página al abrir', () => {
    crear();

    expect(repository.listar).toHaveBeenCalledOnceWith(0, 10);
  });

  it('muestra un indicador mientras carga', () => {
    repository.listar.and.returnValue(new Subject<PaginaPublicaciones>());

    crear();

    expect(element.querySelector('[role="status"]')!.textContent).toContain('Cargando');
    expect(tarjetas().length).toBe(0);
  });

  it('si falla muestra un mensaje con "Reintentar", y al reintentar muestra la lista', () => {
    repository.listar.and.returnValue(
      throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
    );
    crear();
    expect(element.querySelector('[role="alert"]')!.textContent).toContain(
      'No fue posible cargar los alojamientos',
    );

    repository.listar.and.returnValue(of(pagina([alojamiento(1)])));
    boton('Reintentar').click();
    fixture.detectChanges();

    expect(tarjetas().length).toBe(1);
  });

  it('muestra una tarjeta por alojamiento, en el orden que llega la lista', () => {
    crear();

    const titulos = tarjetas().map((t) => t.querySelector('.tarjeta__titulo')!.textContent!.trim());
    expect(titulos).toEqual(['Alojamiento 2', 'Alojamiento 1']);
    expect(element.querySelector('.total')!.textContent).toContain('2 alojamientos');
  });

  it('cada tarjeta muestra título, ciudad, tipo, capacidad y precio por noche', () => {
    crear();

    const texto = tarjetas()[0].textContent!;
    for (const esperado of [
      'Alojamiento 2',
      'Bogotá',
      'Casa',
      '4 huéspedes',
      '250.000',
      'por noche',
    ]) {
      expect(texto).withContext(esperado).toContain(esperado);
    }
  });

  it('una capacidad de 1 se escribe en singular', () => {
    repository.listar.and.returnValue(of(pagina([alojamiento(1, { capacidad: 1 })])));

    crear();

    expect(tarjetas()[0].textContent).toContain('1 huésped');
    expect(tarjetas()[0].textContent).not.toContain('1 huéspedes');
    expect(element.querySelector('.total')!.textContent).toContain('1 alojamiento');
  });

  it('no tiene acciones de gestión: sin botones ni enlaces dentro de las tarjetas', () => {
    crear();

    for (const tarjeta of tarjetas()) {
      expect(tarjeta.querySelector('a')).toBeNull();
      expect(tarjeta.querySelector('button')).toBeNull();
    }
  });

  it('sin alojamientos muestra el mensaje de la API y ninguna tarjeta', () => {
    repository.listar.and.returnValue(
      of(pagina([], 0, 0, 'No hay alojamientos disponibles por el momento')),
    );

    crear();

    expect(element.querySelector('.vacio__mensaje')!.textContent).toContain(
      'No hay alojamientos disponibles por el momento',
    );
    expect(tarjetas().length).toBe(0);
  });

  describe('paginación', () => {
    it('no aparece si hay una sola página', () => {
      crear();

      expect(element.querySelector('.paginacion')).toBeNull();
    });

    it('con varias páginas muestra "Página 1 de 3" y navega con Siguiente y Anterior', () => {
      repository.listar.and.returnValue(of(pagina([alojamiento(1)], 0, 3)));
      crear();
      expect(element.querySelector('.paginacion__texto')!.textContent).toContain('Página 1 de 3');
      expect(boton('Anterior').disabled).toBeTrue();

      repository.listar.and.returnValue(of(pagina([alojamiento(11)], 1, 3)));
      boton('Siguiente').click();
      fixture.detectChanges();

      expect(repository.listar).toHaveBeenCalledWith(1, 10);
      expect(element.querySelector('.paginacion__texto')!.textContent).toContain('Página 2 de 3');
      expect(boton('Anterior').disabled).toBeFalse();
    });
  });
});
