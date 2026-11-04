import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BuscadorPublicacionComponent } from './buscador-publicacion.component';

describe('BuscadorPublicacionComponent', () => {
  let fixture: ComponentFixture<BuscadorPublicacionComponent>;
  let element: HTMLElement;
  let buscados: number[];

  const escribir = (valor: string) => {
    const input = element.querySelector<HTMLInputElement>('#numeroPublicacion')!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const enviar = () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const error = () => element.querySelector('#numeroPublicacion-error')?.textContent?.trim();

  beforeEach(() => {
    fixture = TestBed.createComponent(BuscadorPublicacionComponent);
    element = fixture.nativeElement;
    buscados = [];
    fixture.componentInstance.buscar.subscribe((id) => buscados.push(id));
    fixture.detectChanges();
  });

  it('tiene el campo "Número de publicación" y el botón "Intervenir"', () => {
    expect(element.querySelector('label[for="numeroPublicacion"]')!.textContent!.trim()).toBe(
      'Número de publicación',
    );
    expect(element.querySelector('button[type="submit"]')!.textContent!.trim()).toBe('Intervenir');
  });

  it('emite el número como número', () => {
    escribir('42');

    enviar();

    expect(buscados).toEqual([42]);
    expect(typeof buscados[0]).toBe('number');
  });

  it('recorta los espacios', () => {
    escribir('  7  ');

    enviar();

    expect(buscados).toEqual([7]);
  });

  for (const invalido of ['', '   ', '0', '-3', '2.5', 'abc', '1e3']) {
    it(`"${invalido}" no se envía y explica el error`, () => {
      escribir(invalido);

      enviar();

      expect(buscados).toEqual([]);
      expect(error()).toBe('El número de publicación debe ser un entero mayor que 0');
    });
  }

  it('enfoca el campo cuando es inválido', () => {
    enviar();

    expect(document.activeElement?.id).toBe('numeroPublicacion');
  });

  it('no muestra error antes de tocar el campo', () => {
    expect(error()).toBeUndefined();
  });
});
