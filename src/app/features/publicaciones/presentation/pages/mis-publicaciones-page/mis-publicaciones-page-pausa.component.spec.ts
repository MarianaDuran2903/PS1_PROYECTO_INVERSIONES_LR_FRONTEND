import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import { of, Subject, throwError } from 'rxjs';
import { TransicionNoPermitidaError } from '../../../domain/errors/publicacion.errors';
import {
  EstadoPublicacion,
  PaginaPublicaciones,
  Publicacion,
  PublicacionResumen,
} from '../../../domain/models/publicacion';
import { PublicacionRepository } from '../../../domain/repositories/publicacion.repository';
import { MisPublicacionesPageComponent } from './mis-publicaciones-page.component';

/** HU-014 en "Mis publicaciones": pausar una publicación activa desde el listado. */
describe('MisPublicacionesPageComponent: pausar', () => {
  const resumen = (id: number, estado: EstadoPublicacion): PublicacionResumen => ({
    idPublicacion: id,
    titulo: `Publicación ${id}`,
    estado,
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    capacidad: 4,
    precioNoche: 250000,
  });
  const pagina = (
    contenido: PublicacionResumen[],
    numero = 0,
    totalPaginas = 1,
  ): PaginaPublicaciones => ({
    contenido,
    pagina: numero,
    tamano: 10,
    totalElementos: contenido.length,
    totalPaginas,
    mensaje: null,
  });

  let fixture: ComponentFixture<MisPublicacionesPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<PublicacionRepository>;
  let confirmacion: jasmine.SpyObj<ConfirmacionService>;
  let toast: ToastService;

  const filas = () => Array.from(element.querySelectorAll<HTMLElement>('.tarjeta'));
  const botones = (fila: HTMLElement, texto: string) =>
    Array.from(fila.querySelectorAll<HTMLButtonElement>('button')).filter((b) =>
      b.textContent?.includes(texto),
    );
  const botonPausar = (fila: HTMLElement) => botones(fila, 'Pausar')[0];
  const pausar = (fila: HTMLElement) => {
    botonPausar(fila).click();
    fixture.detectChanges();
  };
  const crear = () => {
    fixture = TestBed.createComponent(MisPublicacionesPageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  };

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'listarPropias',
      'pausar',
      'solicitarActivacion',
    ]);
    repository.listarPropias.and.returnValue(
      of(
        pagina([
          resumen(5, 'ACTIVA'),
          resumen(4, 'PAUSADA'),
          resumen(3, 'BORRADOR'),
          resumen(2, 'PENDIENTE_REVISION'),
          resumen(1, 'BLOQUEADA'),
        ]),
      ),
    );
    confirmacion = jasmine.createSpyObj<ConfirmacionService>('ConfirmacionService', ['confirmar']);
    confirmacion.confirmar.and.returnValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PublicacionRepository, useValue: repository },
        { provide: ConfirmacionService, useValue: confirmacion },
      ],
    });
    toast = TestBed.inject(ToastService);
    crear();
  });

  it('solo las filas ACTIVA tienen el botón "Pausar"', () => {
    expect(filas().map((fila) => botonPausar(fila) !== undefined)).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it('las filas PAUSADA explican que el Administrador revisará los ajustes y dejan Editar activo', () => {
    const pausada = filas()[1];

    expect(pausada.textContent).toContain(
      'El Administrador revisará tus ajustes antes de reactivarla',
    );
    const editar = Array.from(pausada.querySelectorAll('a')).find(
      (a) => a.textContent?.trim() === 'Editar',
    );
    expect(editar?.getAttribute('href')).toBe('/anfitrion/publicaciones/4/editar');
  });

  it('al pausar pide confirmación y llama al servidor con el id de la fila', () => {
    repository.pausar.and.returnValue(new Subject<Publicacion>());

    pausar(filas()[0]);

    expect(confirmacion.confirmar).toHaveBeenCalledTimes(1);
    expect(repository.pausar).toHaveBeenCalledOnceWith(5);
  });

  it('si la persona cancela la confirmación, no llama al servidor', () => {
    confirmacion.confirmar.and.returnValue(false);

    pausar(filas()[0]);

    expect(repository.pausar).not.toHaveBeenCalled();
  });

  it('mientras pausa deshabilita el botón con indicador de carga y también los demás botones', () => {
    repository.pausar.and.returnValue(new Subject<Publicacion>());

    pausar(filas()[0]);

    expect(botones(filas()[0], 'Pausando')[0].disabled).toBeTrue();
    expect(filas()[0].querySelector('.spinner')).not.toBeNull();
    expect(botones(filas()[2], 'Enviar a revisión')[0].disabled).toBeTrue();
  });

  it('con éxito avisa y vuelve a cargar la página que se estaba viendo', () => {
    repository.pausar.and.returnValue(of({} as Publicacion));
    repository.listarPropias.calls.reset();
    repository.listarPropias.and.returnValue(
      of(pagina([resumen(5, 'PAUSADA'), resumen(4, 'PAUSADA')], 0)),
    );

    pausar(filas()[0]);

    expect(toast.toasts().some((t) => t.title === 'Publicación pausada')).toBeTrue();
    expect(repository.listarPropias).toHaveBeenCalledOnceWith(0, 10);
    expect(filas()[0].querySelector('app-estado-publicacion')!.textContent!.trim()).toBe('Pausada');
    expect(botonPausar(filas()[0])).toBeUndefined();
    expect(filas()[0].textContent).toContain(
      'El Administrador revisará tus ajustes antes de reactivarla',
    );
  });

  it('con éxito en la segunda página recarga esa misma página', () => {
    repository.listarPropias.and.returnValue(of(pagina([resumen(5, 'ACTIVA')], 1, 3)));
    crear();
    repository.pausar.and.returnValue(of({} as Publicacion));
    repository.listarPropias.calls.reset();

    pausar(filas()[0]);

    expect(repository.listarPropias).toHaveBeenCalledOnceWith(1, 10);
  });

  it('un 409 muestra el mensaje del backend y vuelve a cargar para refrescar el estado', () => {
    repository.pausar.and.returnValue(
      throwError(() => new TransicionNoPermitidaError('La publicación ya está pausada')),
    );
    repository.listarPropias.calls.reset();
    repository.listarPropias.and.returnValue(of(pagina([resumen(5, 'PAUSADA')])));

    pausar(filas()[0]);

    expect(
      toast
        .toasts()
        .some(
          (t) => t.title === 'No se pudo pausar' && t.message === 'La publicación ya está pausada',
        ),
    ).toBeTrue();
    expect(repository.listarPropias).toHaveBeenCalledOnceWith(0, 10);
    expect(filas()[0].querySelector('app-estado-publicacion')!.textContent!.trim()).toBe('Pausada');
  });
});
