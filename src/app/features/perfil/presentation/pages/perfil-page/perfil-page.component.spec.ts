import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Perfil } from '../../../domain/models/perfil';
import { PerfilRepository } from '../../../domain/repositories/perfil.repository';
import { PerfilPageComponent } from './perfil-page.component';
import { ToastService } from '@core/notifications/toast.service';
import { SessionService } from '@features/auth/application/session.service';
import { Router } from '@angular/router';

describe('PerfilPageComponent', () => {
  let fixture: ComponentFixture<PerfilPageComponent>;
  let respuesta: Subject<Perfil>;
  let respuestaActualizacion: Subject<Perfil>;
  let respuestaEstado: Subject<Perfil>;
  let repository: jasmine.SpyObj<PerfilRepository>;
  let toast: jasmine.SpyObj<ToastService>;
  let router: jasmine.SpyObj<Router>;
  let session: jasmine.SpyObj<SessionService>;

  const perfil: Perfil = {
    idUsuario: 7,
    primerNombre: 'Ana',
    segundoNombre: null,
    primerApellido: 'Ruiz',
    segundoApellido: null,
    correo: 'ana@example.com',
    rol: 'HUESPED',
    cuentaActiva: true,
  };

  beforeEach(async () => {
    respuesta = new Subject<Perfil>();
    respuestaActualizacion = new Subject<Perfil>();
    respuestaEstado = new Subject<Perfil>();
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['success']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    session = jasmine.createSpyObj<SessionService>('SessionService', [
      'cerrar',
      'actualizarNombrePerfil',
    ]);
    repository = jasmine.createSpyObj<PerfilRepository>('PerfilRepository', [
      'consultar',
      'actualizar',
      'cambiarEstado',
    ]);
    repository.consultar.and.returnValue(respuesta);
    repository.actualizar.and.returnValue(respuestaActualizacion);
    repository.cambiarEstado.and.returnValue(respuestaEstado);

    await TestBed.configureTestingModule({
      imports: [PerfilPageComponent],
    })
      .overrideComponent(PerfilPageComponent, {
        add: {
          providers: [
            { provide: PerfilRepository, useValue: repository },
            { provide: ToastService, useValue: toast },
            { provide: Router, useValue: router },
            { provide: SessionService, useValue: session },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PerfilPageComponent);
    fixture.detectChanges();
  });

  function abrirEdicion(): HTMLElement {
    respuesta.next(perfil);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.perfil__acciones button')!.click();
    fixture.detectChanges();

    return element;
  }

  function escribir(element: HTMLElement, id: string, valor: string): void {
    const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function enviar(element: HTMLElement): void {
    element
      .querySelector<HTMLFormElement>('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  function abrirModalDesactivacion(): HTMLElement {
    respuesta.next(perfil);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('.perfil__desactivar')!.click();
    fixture.detectChanges();

    return element;
  }

  it('muestra la carga y después los datos de la cuenta', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="status"]')).not.toBeNull();

    respuesta.next({
      idUsuario: 7,
      primerNombre: 'Ana',
      segundoNombre: null,
      primerApellido: 'Ruiz',
      segundoApellido: 'Perez',
      correo: 'ana@example.com',
      rol: 'ANFITRION',
      cuentaActiva: true,
    });
    fixture.detectChanges();

    expect(element.textContent).toContain('ana@example.com');
    expect(element.textContent).toContain('Anfitrión');
    expect(element.textContent).toContain('No registrado');
    expect(element.textContent).toContain('Perez');
    expect(element.textContent).toContain('Activa');
    expect(element.querySelector('input')).toBeNull();
    expect(element.querySelector('[role="status"]')).toBeNull();
  });

  it('muestra error y permite reintentar', () => {
    respuesta.error(new Error('fallo'));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')).not.toBeNull();

    respuesta = new Subject<Perfil>();
    repository.consultar.and.returnValue(respuesta);

    element.querySelector('button')?.click();
    fixture.detectChanges();

    expect(repository.consultar).toHaveBeenCalledTimes(2);
    expect(element.querySelector('[role="status"]')).not.toBeNull();
  });

  it('abre la edición con los datos registrados', () => {
    const element = abrirEdicion();

    expect(element.querySelector<HTMLInputElement>('#primerNombre')!.value).toBe('Ana');
    expect(element.querySelector<HTMLInputElement>('#segundoNombre')!.value).toBe('');
    expect(element.querySelector<HTMLInputElement>('#primerApellido')!.value).toBe('Ruiz');
    expect(element.querySelectorAll('input').length).toBe(4);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('cancela sin guardar y recupera los datos originales al volver a editar', () => {
    const element = abrirEdicion();
    escribir(element, 'primerNombre', 'Cambio sin guardar');

    element.querySelector<HTMLButtonElement>('.perfil__botones button[type="button"]')!.click();
    fixture.detectChanges();

    expect(element.querySelector('form')).toBeNull();
    expect(repository.actualizar).not.toHaveBeenCalled();

    element.querySelector<HTMLButtonElement>('.perfil__acciones button')!.click();
    fixture.detectChanges();

    expect(element.querySelector<HTMLInputElement>('#primerNombre')!.value).toBe('Ana');
  });

  it('rechaza un primer nombre vacío sin enviar la actualización', () => {
    const element = abrirEdicion();
    escribir(element, 'primerNombre', '');
    enviar(element);

    expect(repository.actualizar).not.toHaveBeenCalled();
    expect(element.textContent).toContain('El primer nombre es obligatorio.');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('envía datos normalizados y solo cierra la edición después del éxito', () => {
    const element = abrirEdicion();

    escribir(element, 'primerNombre', '  Carlos  ');
    escribir(element, 'segundoNombre', '   ');
    enviar(element);

    expect(repository.actualizar).toHaveBeenCalledOnceWith({
      primerNombre: 'Carlos',
      segundoNombre: null,
      primerApellido: 'Ruiz',
      segundoApellido: null,
    });

    expect(element.querySelector('form')).not.toBeNull();
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBeTrue();
    expect(toast.success).not.toHaveBeenCalled();

    respuestaActualizacion.next({ ...perfil, primerNombre: 'Carlos' });
    respuestaActualizacion.complete();
    fixture.detectChanges();

    expect(element.querySelector('form')).toBeNull();
    expect(element.querySelector('.perfil__datos')!.textContent).toContain('Carlos');
    expect(toast.success).toHaveBeenCalledOnceWith(
      'Perfil actualizado',
      'Tus datos se guardaron correctamente.',
    );
  });

  it('conserva lo escrito y permite continuar editando si falla el guardado', () => {
    const element = abrirEdicion();

    escribir(element, 'primerNombre', 'Carlos');
    enviar(element);

    respuestaActualizacion.error(new Error('fallo'));
    fixture.detectChanges();

    expect(element.querySelector('form')).not.toBeNull();
    expect(element.querySelector<HTMLInputElement>('#primerNombre')!.value).toBe('Carlos');
    expect(element.querySelector('[role="alert"]')!.textContent).toContain(
      'No fue posible actualizar',
    );
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBeFalse();
    expect(toast.success).not.toHaveBeenCalled();
  });

  describe('gestión del estado de la cuenta', () => {
    it('abre y cancela el modal de desactivación', () => {
      const element = abrirModalDesactivacion();

      expect(element.querySelector('[aria-labelledby="modal-desactivar-titulo"]')).not.toBeNull();
      expect(repository.cambiarEstado).not.toHaveBeenCalled();

      element
        .querySelector<HTMLButtonElement>(
          '[aria-labelledby="modal-desactivar-titulo"] .modal__cancelar',
        )!
        .click();
      fixture.detectChanges();

      expect(element.querySelector('[aria-labelledby="modal-desactivar-titulo"]')).toBeNull();
      expect(repository.cambiarEstado).not.toHaveBeenCalled();
    });

    it('confirma la desactivación y envía cuentaActiva en falso', () => {
      const element = abrirModalDesactivacion();

      element
        .querySelector<HTMLButtonElement>(
          '[aria-labelledby="modal-desactivar-titulo"] .perfil__desactivar',
        )!
        .click();
      fixture.detectChanges();

      expect(repository.cambiarEstado).toHaveBeenCalledOnceWith({
        cuentaActiva: false,
      });
      expect(
        element.querySelector<HTMLButtonElement>(
          '[aria-labelledby="modal-desactivar-titulo"] .perfil__desactivar',
        )!.disabled,
      ).toBeTrue();
    });

    it('cierra la sesión y redirige al login después de desactivar', () => {
      const element = abrirModalDesactivacion();

      element
        .querySelector<HTMLButtonElement>(
          '[aria-labelledby="modal-desactivar-titulo"] .perfil__desactivar',
        )!
        .click();
      fixture.detectChanges();

      respuestaEstado.next({ ...perfil, cuentaActiva: false });
      respuestaEstado.complete();
      fixture.detectChanges();

      expect(session.cerrar).toHaveBeenCalledOnceWith();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/login'], {
        queryParams: { cuentaDesactivada: 'true' },
      });
      expect(element.querySelector('[aria-labelledby="modal-desactivar-titulo"]')).toBeNull();
    });

    it('mantiene el modal y muestra el error si la desactivación falla', () => {
      const element = abrirModalDesactivacion();

      element
        .querySelector<HTMLButtonElement>(
          '[aria-labelledby="modal-desactivar-titulo"] .perfil__desactivar',
        )!
        .click();
      fixture.detectChanges();

      respuestaEstado.error(new Error('fallo'));
      fixture.detectChanges();

      expect(element.querySelector('[aria-labelledby="modal-desactivar-titulo"]')).not.toBeNull();
      expect(element.querySelector('.perfil__error-estado')!.textContent).toContain(
        'No fue posible cambiar el estado',
      );
      expect(session.cerrar).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });
});
