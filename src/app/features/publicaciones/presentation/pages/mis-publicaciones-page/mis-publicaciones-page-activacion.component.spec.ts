import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import { ToastService } from '@core/notifications/toast.service';
import { of, Subject, throwError } from 'rxjs';
import {
  InformacionMinimaIncompletaError,
  TransicionNoPermitidaError,
} from '../../../domain/errors/publicacion.errors';
import {
  EstadoPublicacion,
  PaginaPublicaciones,
  Publicacion,
  PublicacionResumen,
} from '../../../domain/models/publicacion';
import { PublicacionRepository } from '../../../domain/repositories/publicacion.repository';
import { MisPublicacionesPageComponent } from './mis-publicaciones-page.component';

/** HU-012 en "Mis publicaciones": enviar un borrador a revisión desde el listado. */
describe('MisPublicacionesPageComponent: enviar a revisión', () => {
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
  const botonEnviar = (fila: HTMLElement) =>
    Array.from(fila.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Enviar a revisión'),
    );
  const enviar = (fila: HTMLElement) => {
    botonEnviar(fila)!.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'listarPropias',
      'solicitarActivacion',
    ]);
    repository.listarPropias.and.returnValue(
      of(
        pagina([
          resumen(5, 'BORRADOR'),
          resumen(4, 'PENDIENTE_REVISION'),
          resumen(3, 'ACTIVA'),
          resumen(2, 'PAUSADA'),
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
    fixture = TestBed.createComponent(MisPublicacionesPageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('solo las filas en BORRADOR tienen el botón "Enviar a revisión"', () => {
    const conBoton = filas().map((fila) => botonEnviar(fila) !== undefined);

    expect(conBoton).toEqual([true, false, false, false, false]);
  });

  it('las filas en PENDIENTE_REVISION muestran "En revisión del Administrador"', () => {
    const [, enRevision] = filas();

    expect(enRevision.textContent).toContain('En revisión del Administrador');
    expect(filas()[0].textContent).not.toContain('En revisión del Administrador');
  });

  it('al enviar pide confirmación y luego llama al servidor con el id de la fila', () => {
    repository.solicitarActivacion.and.returnValue(new Subject<Publicacion>());

    enviar(filas()[0]);

    expect(confirmacion.confirmar).toHaveBeenCalledTimes(1);
    expect(repository.solicitarActivacion).toHaveBeenCalledOnceWith(5);
  });

  it('si la persona cancela la confirmación, no llama al servidor', () => {
    confirmacion.confirmar.and.returnValue(false);

    enviar(filas()[0]);

    expect(repository.solicitarActivacion).not.toHaveBeenCalled();
  });

  it('mientras envía deshabilita el botón y muestra el indicador de carga', () => {
    repository.solicitarActivacion.and.returnValue(new Subject<Publicacion>());

    enviar(filas()[0]);

    const boton = Array.from(filas()[0].querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Enviando'),
    )!;
    expect(boton.disabled).toBeTrue();
    expect(filas()[0].querySelector('.spinner')).not.toBeNull();
  });

  it('con éxito avisa y vuelve a cargar la página que se estaba viendo', () => {
    repository.solicitarActivacion.and.returnValue(of({} as Publicacion));
    repository.listarPropias.calls.reset();
    repository.listarPropias.and.returnValue(
      of(pagina([resumen(5, 'PENDIENTE_REVISION'), resumen(4, 'PENDIENTE_REVISION')], 0)),
    );

    enviar(filas()[0]);

    expect(toast.toasts().some((t) => t.title === 'Publicación enviada a revisión')).toBeTrue();
    expect(repository.listarPropias).toHaveBeenCalledOnceWith(0, 10);
    expect(filas()[0].textContent).toContain('En revisión del Administrador');
    expect(botonEnviar(filas()[0])).toBeUndefined();
  });

  it('con éxito en la segunda página recarga esa misma página', () => {
    repository.listarPropias.and.returnValue(of(pagina([resumen(5, 'BORRADOR')], 1, 3)));
    fixture = TestBed.createComponent(MisPublicacionesPageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
    repository.solicitarActivacion.and.returnValue(of({} as Publicacion));
    repository.listarPropias.calls.reset();

    enviar(filas()[0]);

    expect(repository.listarPropias).toHaveBeenCalledOnceWith(1, 10);
  });

  it('con campos pendientes muestra el panel con cada mensaje y un enlace para completarla', () => {
    repository.solicitarActivacion.and.returnValue(
      throwError(
        () =>
          new InformacionMinimaIncompletaError({
            descripcion: 'La descripción es obligatoria para solicitar la activación',
            reglas: 'Las reglas son obligatorias para solicitar la activación',
          }),
      ),
    );
    repository.listarPropias.calls.reset();

    enviar(filas()[0]);

    const panel = element.querySelector('app-pendientes-activacion')!;
    expect(panel.textContent).toContain('Publicación 5');
    expect(panel.textContent).toContain(
      'La descripción es obligatoria para solicitar la activación',
    );
    expect(panel.textContent).toContain('Las reglas son obligatorias para solicitar la activación');
    expect(panel.querySelector('a')?.getAttribute('href')).toBe(
      '/anfitrion/publicaciones/5/editar',
    );
    // La publicación no cambió: no hace falta recargar y sigue como borrador.
    expect(repository.listarPropias).not.toHaveBeenCalled();
    expect(botonEnviar(filas()[0])).toBeDefined();
  });

  it('el panel de pendientes desaparece al reintentar con éxito', () => {
    repository.solicitarActivacion.and.returnValue(
      throwError(() => new InformacionMinimaIncompletaError({ reglas: 'Faltan las reglas' })),
    );
    enviar(filas()[0]);
    expect(element.querySelector('app-pendientes-activacion')).not.toBeNull();

    repository.solicitarActivacion.and.returnValue(of({} as Publicacion));
    repository.listarPropias.and.returnValue(of(pagina([resumen(5, 'PENDIENTE_REVISION')])));
    enviar(filas()[0]);

    expect(element.querySelector('app-pendientes-activacion')).toBeNull();
  });

  it('un 409 muestra el mensaje del backend y vuelve a cargar para refrescar el estado', () => {
    repository.solicitarActivacion.and.returnValue(
      throwError(() => new TransicionNoPermitidaError('La publicación ya está en revisión')),
    );
    repository.listarPropias.calls.reset();
    repository.listarPropias.and.returnValue(of(pagina([resumen(5, 'PENDIENTE_REVISION')])));

    enviar(filas()[0]);

    expect(
      toast
        .toasts()
        .some(
          (t) =>
            t.title === 'No se pudo enviar a revisión' &&
            t.message === 'La publicación ya está en revisión',
        ),
    ).toBeTrue();
    expect(repository.listarPropias).toHaveBeenCalledOnceWith(0, 10);
    expect(filas()[0].textContent).toContain('En revisión del Administrador');
  });
});
