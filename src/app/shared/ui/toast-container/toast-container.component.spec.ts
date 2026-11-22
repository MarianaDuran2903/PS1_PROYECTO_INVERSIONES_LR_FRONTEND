import { TestBed } from '@angular/core/testing';
import { ToastService } from '@core/notifications/toast.service';
import { ToastContainerComponent } from './toast-container.component';

describe('ToastContainerComponent', () => {
  it('muestra el aviso con su título y lo cierra con el botón', () => {
    const fixture = TestBed.createComponent(ToastContainerComponent);
    const toasts = TestBed.inject(ToastService);

    toasts.success('¡Bienvenido, María José!', 'Tu cuenta fue creada correctamente.', 0);
    fixture.detectChanges();

    const aviso = fixture.nativeElement.querySelector('.toast') as HTMLElement;
    expect(aviso.getAttribute('role')).toBe('status');
    expect(aviso.textContent).toContain('¡Bienvenido, María José!');

    (aviso.querySelector('.toast__cerrar') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.toast')).toBeNull();
  });
});
