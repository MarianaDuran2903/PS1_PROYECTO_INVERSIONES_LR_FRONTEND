import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequisitosContrasenaComponent } from './requisitos-contrasena.component';

describe('RequisitosContrasenaComponent', () => {
  let fixture: ComponentFixture<RequisitosContrasenaComponent>;
  let element: HTMLElement;

  const mostrar = (valor: string) => {
    fixture.componentRef.setInput('valor', valor);
    fixture.detectChanges();
  };
  const cumple = (clave: string) =>
    element
      .querySelector(`[data-requisito="${clave}"]`)!
      .classList.contains('requisitos__item--cumple');

  beforeEach(() => {
    fixture = TestBed.createComponent(RequisitosContrasenaComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.detectChanges();
  });

  it('con el campo vacío ningún requisito se cumple', () => {
    for (const li of Array.from(element.querySelectorAll('[data-requisito]'))) {
      expect(li.classList.contains('requisitos__item--cumple')).toBeFalse();
    }
  });

  it('marca cada requisito a medida que se cumple y lo anuncia a quien usa lector de pantalla', () => {
    mostrar('Nueva#456');

    for (const clave of ['largo', 'mayuscula', 'minuscula', 'numero', 'especial', 'espacios']) {
      expect(cumple(clave)).withContext(clave).toBeTrue();
    }
    expect(element.querySelector('[data-requisito="largo"]')?.textContent).toContain('(cumple)');
  });

  it('un espacio rompe "sin espacios"', () => {
    mostrar('Nueva #456');
    expect(cumple('espacios')).toBeFalse();
    expect(element.querySelector('[data-requisito="espacios"]')?.textContent).toContain(
      '(pendiente)',
    );
  });

  it('el requisito de bytes solo aparece cuando se pasa de 72 bytes', () => {
    mostrar('Nueva#456');
    expect(element.querySelector('[data-requisito="bytes"]')).toBeNull();

    mostrar('Á1#a' + 'ñ'.repeat(40));
    expect(element.querySelector('[data-requisito="bytes"]')).not.toBeNull();
    expect(cumple('bytes')).toBeFalse();
  });
});
