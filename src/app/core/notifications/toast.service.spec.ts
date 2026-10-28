import { fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  it('agrega avisos y los retira solos pasado el tiempo', fakeAsync(() => {
    const service = new ToastService();

    service.success('¡Bienvenido, Ana!', 'Cuenta creada', 1000);
    service.error('Falló', undefined, 3000);

    expect(service.toasts().map((t) => [t.type, t.title])).toEqual([
      ['success', '¡Bienvenido, Ana!'],
      ['error', 'Falló'],
    ]);

    tick(1000);
    expect(service.toasts().map((t) => t.type)).toEqual(['error']);

    tick(2000);
    expect(service.toasts()).toEqual([]);
  }));

  it('permite cerrar un aviso manualmente', () => {
    const service = new ToastService();
    const id = service.info('Hola', undefined, 0);

    service.dismiss(id);

    expect(service.toasts()).toEqual([]);
  });
});
