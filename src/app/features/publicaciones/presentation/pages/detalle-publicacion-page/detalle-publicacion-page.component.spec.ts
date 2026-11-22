import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ApiError } from '@core/http/api-error';
import { ToastService } from '@core/notifications/toast.service';
import { of, Subject, throwError } from 'rxjs';
import {
  PublicacionAjenaError,
  PublicacionNoEncontradaError,
} from '../../../domain/errors/publicacion.errors';
import { EstadoPublicacion, Publicacion } from '../../../domain/models/publicacion';
import { PublicacionRepository } from '../../../domain/repositories/publicacion.repository';
import { DetallePublicacionPageComponent } from './detalle-publicacion-page.component';

describe('DetallePublicacionPageComponent', () => {
  const publicacion = (estado: EstadoPublicacion = 'BORRADOR'): Publicacion => ({
    idPublicacion: 9,
    idAnfitrion: 3,
    estado,
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: 'Chapinero',
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 30000,
    reglas: null,
    motivoBloqueo: null,
  });

  let fixture: ComponentFixture<DetallePublicacionPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<PublicacionRepository>;
  let router: Router;
  let toast: ToastService;

  const crearPagina = (id: string | undefined = '9') => {
    fixture = TestBed.createComponent(DetallePublicacionPageComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
  };
  const texto = (selector: string) => element.querySelector(selector)?.textContent?.trim();

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', ['obtener']);
    repository.obtener.and.returnValue(of(publicacion()));
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PublicacionRepository, useValue: repository }],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    toast = TestBed.inject(ToastService);
  });

  it('pide la publicación con el id de la ruta', () => {
    crearPagina('9');

    expect(repository.obtener).toHaveBeenCalledOnceWith(9);
  });

  it('muestra el detalle: título, estado, dirección, descripción y precio', () => {
    crearPagina();

    expect(texto('h1')).toBe('Apartamento luminoso');
    expect(texto('app-estado-publicacion')).toBe('Borrador');
    expect(texto('.ficha__direccion')).toContain('Calle 10 # 5-20, Chapinero, Bogotá');
    expect(texto('.ficha__descripcion')).toContain('Cerca del parque');
    expect(texto('.ficha__resumen')).toMatch(/250\.000/);
  });

  it('NO muestra el aviso de "guardada como borrador" ni "Crear otra publicación"', () => {
    crearPagina();

    expect(element.querySelector('.ficha__aviso')).toBeNull();
    expect(element.textContent).not.toContain('Publicación guardada como borrador');
    expect(element.textContent).not.toContain('Crear otra publicación');
  });

  it('tiene "Volver a mis publicaciones" hacia el listado', () => {
    crearPagina();

    const volver = Array.from(element.querySelectorAll<HTMLAnchorElement>('a')).find((a) =>
      a.textContent?.includes('Volver a mis publicaciones'),
    )!;
    expect(volver.getAttribute('href')).toBe('/anfitrion/publicaciones');
  });

  it('"Editar" está activo en BORRADOR y apunta a la edición de esa publicación', () => {
    crearPagina();

    const editar = element.querySelector<HTMLAnchorElement>('app-boton-editar-publicacion a')!;
    expect(editar.getAttribute('href')).toBe('/anfitrion/publicaciones/9/editar');
  });

  it('en ACTIVA, "Editar" está deshabilitado con el tooltip del motivo', () => {
    repository.obtener.and.returnValue(of(publicacion('ACTIVA')));

    crearPagina();

    const editar = element.querySelector<HTMLButtonElement>('app-boton-editar-publicacion button')!;
    expect(editar.getAttribute('aria-disabled')).toBe('true');
    expect(editar.getAttribute('title')).toContain('está activa');
    expect(texto('app-estado-publicacion')).toBe('Activa');
  });

  it('muestra un indicador mientras carga', () => {
    repository.obtener.and.returnValue(new Subject<Publicacion>());

    crearPagina();

    expect(texto('[role="status"]')).toContain('Cargando');
    expect(element.querySelector('app-publicacion-confirmacion')).toBeNull();
  });

  it('si falla muestra "Reintentar" y, al reintentar, el detalle', () => {
    repository.obtener.and.returnValue(
      throwError(() => new ApiError(0, 'NETWORK_ERROR', 'Sin conexión')),
    );
    crearPagina();
    expect(texto('[role="alert"]')).toContain('No fue posible cargar la publicación');

    repository.obtener.and.returnValue(of(publicacion()));
    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    fixture.detectChanges();

    expect(texto('h1')).toBe('Apartamento luminoso');
  });

  it('404: avisa y vuelve al listado', () => {
    repository.obtener.and.returnValue(throwError(() => new PublicacionNoEncontradaError()));

    crearPagina();

    expect(toast.toasts().some((t) => t.title === 'La publicación no existe')).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/anfitrion', 'publicaciones']);
  });

  it('403 (publicación de otro Anfitrión): avisa, vuelve al listado y no muestra sus datos', () => {
    repository.obtener.and.returnValue(throwError(() => new PublicacionAjenaError()));

    crearPagina();

    expect(toast.toasts().some((t) => t.title === 'No puedes ver esta publicación')).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/anfitrion', 'publicaciones']);
    expect(element.querySelector('app-publicacion-confirmacion')).toBeNull();
  });

  it('un id que no es un número no llama al backend y vuelve al listado', () => {
    crearPagina('abc');

    expect(repository.obtener).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/anfitrion', 'publicaciones']);
  });
});
