import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import { of, Subject, throwError } from 'rxjs';
import { TransicionNoPermitidaError } from '../../../domain/errors/publicacion.errors';
import { EstadoPublicacion, Publicacion } from '../../../domain/models/publicacion';
import { PublicacionRepository } from '../../../domain/repositories/publicacion.repository';
import { DetallePublicacionPageComponent } from './detalle-publicacion-page.component';

/** HU-014 en el detalle: pausar una publicación activa desde la ficha. */
describe('DetallePublicacionPageComponent: pausar', () => {
  const publicacion = (estado: EstadoPublicacion = 'ACTIVA'): Publicacion => ({
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
    reglas: 'No fumar',
  });

  let fixture: ComponentFixture<DetallePublicacionPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<PublicacionRepository>;
  let confirmacion: jasmine.SpyObj<ConfirmacionService>;
  let toast: ToastService;

  const crearPagina = (estado: EstadoPublicacion = 'ACTIVA') => {
    repository.obtener.and.returnValue(of(publicacion(estado)));
    fixture = TestBed.createComponent(DetallePublicacionPageComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('id', '9');
    fixture.detectChanges();
  };
  const botonPausar = () =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.trim().startsWith('Pausa'),
    );
  const pausar = () => {
    botonPausar()!.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'obtener',
      'pausar',
    ]);
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
  });

  it('una publicación activa muestra el botón "Pausar"', () => {
    crearPagina('ACTIVA');

    expect(botonPausar()?.textContent?.trim()).toBe('Pausar');
  });

  it('una publicación pausada muestra el texto del Administrador y no el botón', () => {
    crearPagina('PAUSADA');

    expect(botonPausar()).toBeUndefined();
    expect(element.querySelector('.ficha__resumen')!.textContent).toContain(
      'El Administrador revisará tus ajustes antes de reactivarla',
    );
  });

  for (const estado of ['BORRADOR', 'PENDIENTE_REVISION', 'BLOQUEADA'] as const) {
    it(`en ${estado} no hay botón de pausar`, () => {
      crearPagina(estado);

      expect(botonPausar()).toBeUndefined();
    });
  }

  it('pide confirmación y llama al servidor con el id de la publicación', () => {
    crearPagina();
    repository.pausar.and.returnValue(new Subject<Publicacion>());

    pausar();

    expect(confirmacion.confirmar).toHaveBeenCalledTimes(1);
    expect(repository.pausar).toHaveBeenCalledOnceWith(9);
  });

  it('si la persona cancela, no llama al servidor', () => {
    crearPagina();
    confirmacion.confirmar.and.returnValue(false);

    pausar();

    expect(repository.pausar).not.toHaveBeenCalled();
  });

  it('mientras pausa deshabilita el botón con indicador de carga', () => {
    crearPagina();
    repository.pausar.and.returnValue(new Subject<Publicacion>());

    pausar();

    const boton = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Pausando'),
    )!;
    expect(boton.disabled).toBeTrue();
  });

  it('con éxito avisa y recarga la publicación, que pasa a "Pausada"', () => {
    crearPagina();
    repository.pausar.and.returnValue(of(publicacion('PAUSADA')));
    repository.obtener.calls.reset();
    repository.obtener.and.returnValue(of(publicacion('PAUSADA')));

    pausar();

    expect(toast.toasts().some((t) => t.title === 'Publicación pausada')).toBeTrue();
    expect(repository.obtener).toHaveBeenCalledOnceWith(9);
    expect(element.querySelector('app-estado-publicacion')?.textContent?.trim()).toBe('Pausada');
    expect(botonPausar()).toBeUndefined();
  });

  it('un 409 muestra el mensaje del backend y recarga para refrescar el estado', () => {
    crearPagina();
    repository.pausar.and.returnValue(
      throwError(() => new TransicionNoPermitidaError('La publicación ya está pausada')),
    );
    repository.obtener.calls.reset();
    repository.obtener.and.returnValue(of(publicacion('PAUSADA')));

    pausar();

    expect(
      toast
        .toasts()
        .some(
          (t) => t.title === 'No se pudo pausar' && t.message === 'La publicación ya está pausada',
        ),
    ).toBeTrue();
    expect(repository.obtener).toHaveBeenCalledOnceWith(9);
    expect(element.querySelector('app-estado-publicacion')?.textContent?.trim()).toBe('Pausada');
  });
});
