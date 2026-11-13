import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import { of, Subject, throwError } from 'rxjs';
import {
  InformacionMinimaIncompletaError,
  TransicionNoPermitidaError,
} from '../../../domain/errors/publicacion.errors';
import { EstadoPublicacion, Publicacion } from '../../../domain/models/publicacion';
import { PublicacionRepository } from '../../../domain/repositories/publicacion.repository';
import { DetallePublicacionPageComponent } from './detalle-publicacion-page.component';

/** HU-012 en el detalle: enviar el borrador a revisión desde la ficha. */
describe('DetallePublicacionPageComponent: enviar a revisión', () => {
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
  });

  let fixture: ComponentFixture<DetallePublicacionPageComponent>;
  let element: HTMLElement;
  let repository: jasmine.SpyObj<PublicacionRepository>;
  let confirmacion: jasmine.SpyObj<ConfirmacionService>;
  let toast: ToastService;

  const crearPagina = (estado: EstadoPublicacion = 'BORRADOR') => {
    repository.obtener.and.returnValue(of(publicacion(estado)));
    fixture = TestBed.createComponent(DetallePublicacionPageComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('id', '9');
    fixture.detectChanges();
  };
  const botonEnviar = () =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Enviar a revisión'),
    );
  const enviar = () => {
    botonEnviar()!.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'obtener',
      'solicitarActivacion',
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

  it('un borrador muestra el botón "Enviar a revisión"', () => {
    crearPagina('BORRADOR');

    expect(botonEnviar()).toBeDefined();
  });

  it('una publicación en revisión muestra "En revisión del Administrador" y no el botón', () => {
    crearPagina('PENDIENTE_REVISION');

    expect(botonEnviar()).toBeUndefined();
    expect(element.querySelector('.ficha__resumen')?.textContent).toContain(
      'En revisión del Administrador',
    );
  });

  for (const estado of ['ACTIVA', 'PAUSADA', 'BLOQUEADA'] as const) {
    it(`en ${estado} no hay botón de enviar`, () => {
      crearPagina(estado);

      expect(botonEnviar()).toBeUndefined();
    });
  }

  it('pide confirmación y llama al servidor con el id de la publicación', () => {
    crearPagina();
    repository.solicitarActivacion.and.returnValue(new Subject<Publicacion>());

    enviar();

    expect(confirmacion.confirmar).toHaveBeenCalledTimes(1);
    expect(repository.solicitarActivacion).toHaveBeenCalledOnceWith(9);
  });

  it('si la persona cancela, no llama al servidor', () => {
    crearPagina();
    confirmacion.confirmar.and.returnValue(false);

    enviar();

    expect(repository.solicitarActivacion).not.toHaveBeenCalled();
  });

  it('mientras envía deshabilita el botón con indicador de carga', () => {
    crearPagina();
    repository.solicitarActivacion.and.returnValue(new Subject<Publicacion>());

    enviar();

    const boton = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Enviando'),
    )!;
    expect(boton.disabled).toBeTrue();
  });

  it('con éxito avisa y recarga la publicación, que pasa a "Pendiente de revisión"', () => {
    crearPagina();
    repository.solicitarActivacion.and.returnValue(of(publicacion('PENDIENTE_REVISION')));
    repository.obtener.calls.reset();
    repository.obtener.and.returnValue(of(publicacion('PENDIENTE_REVISION')));

    enviar();

    expect(toast.toasts().some((t) => t.title === 'Publicación enviada a revisión')).toBeTrue();
    expect(repository.obtener).toHaveBeenCalledOnceWith(9);
    expect(element.querySelector('app-estado-publicacion')?.textContent?.trim()).toBe(
      'Pendiente de revisión',
    );
    expect(botonEnviar()).toBeUndefined();
  });

  it('con campos pendientes muestra el panel con su enlace y no recarga ni cambia el estado', () => {
    crearPagina();
    repository.solicitarActivacion.and.returnValue(
      throwError(
        () =>
          new InformacionMinimaIncompletaError({
            reglas: 'Las reglas son obligatorias para solicitar la activación',
          }),
      ),
    );
    repository.obtener.calls.reset();

    enviar();

    const panel = element.querySelector('app-pendientes-activacion')!;
    expect(panel.textContent).toContain('Las reglas son obligatorias para solicitar la activación');
    expect(panel.querySelector('a')?.getAttribute('href')).toBe(
      '/anfitrion/publicaciones/9/editar',
    );
    expect(repository.obtener).not.toHaveBeenCalled();
    expect(element.querySelector('app-estado-publicacion')?.textContent?.trim()).toBe('Borrador');
  });

  it('un 409 muestra el mensaje del backend y recarga para refrescar el estado', () => {
    crearPagina();
    repository.solicitarActivacion.and.returnValue(
      throwError(() => new TransicionNoPermitidaError('La publicación ya está activa')),
    );
    repository.obtener.calls.reset();
    repository.obtener.and.returnValue(of(publicacion('ACTIVA')));

    enviar();

    expect(
      toast
        .toasts()
        .some(
          (t) =>
            t.title === 'No se pudo enviar a revisión' &&
            t.message === 'La publicación ya está activa',
        ),
    ).toBeTrue();
    expect(repository.obtener).toHaveBeenCalledOnceWith(9);
    expect(element.querySelector('app-estado-publicacion')?.textContent?.trim()).toBe('Activa');
  });
});
