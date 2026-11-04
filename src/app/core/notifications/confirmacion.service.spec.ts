import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ConfirmacionService } from './confirmacion.service';

describe('ConfirmacionService', () => {
  const crear = (documento: Partial<Document>) => {
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: documento }],
    });
    return TestBed.inject(ConfirmacionService);
  };

  it('devuelve lo que responda la persona en el cuadro del navegador', () => {
    const confirm = jasmine.createSpy('confirm').and.returnValues(true, false);
    const servicio = crear({ defaultView: { confirm } as unknown as Window & typeof globalThis });

    expect(servicio.confirmar('¿Seguro?')).toBeTrue();
    expect(servicio.confirmar('¿Seguro?')).toBeFalse();
    expect(confirm).toHaveBeenCalledWith('¿Seguro?');
  });

  it('sin ventana no bloquea nada', () => {
    const servicio = crear({ defaultView: null });

    expect(servicio.confirmar('¿Seguro?')).toBeTrue();
  });
});
