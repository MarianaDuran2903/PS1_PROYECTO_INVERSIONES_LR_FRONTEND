import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Credenciales } from '../../../domain/models/sesion';
import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent', () => {
  let fixture: ComponentFixture<LoginFormComponent>;
  let element: HTMLElement;
  let emitidas: Credenciales[];

  const escribir = (id: string, valor: string) => {
    const input = element.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };
  const enviar = () => {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
  };
  const textoError = (id: string) => element.querySelector(`#${id}-error`)?.textContent?.trim();

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginFormComponent);
    element = fixture.nativeElement;
    emitidas = [];
    fixture.componentInstance.iniciar.subscribe((c) => emitidas.push(c));
    fixture.detectChanges();
  });

  it('no emite y marca los campos obligatorios cuando está vacío', () => {
    enviar();

    expect(emitidas).toEqual([]);
    expect(textoError('correo')).toBe('Este campo es obligatorio.');
    expect(textoError('contrasena')).toBe('Este campo es obligatorio.');
    expect(document.activeElement?.id).toBe('correo');
  });

  it('rechaza un correo con formato inválido', () => {
    escribir('correo', 'ana@correo');
    escribir('contrasena', 'x');
    enviar();

    expect(emitidas).toEqual([]);
    expect(textoError('correo')).toBe('Ingresa un correo electrónico válido.');
  });

  it('emite las credenciales cuando son válidas', () => {
    escribir('correo', 'ana@correo.com');
    escribir('contrasena', 'Segura#2026');
    enviar();

    expect(emitidas).toEqual([{ correo: 'ana@correo.com', contrasena: 'Segura#2026' }]);
  });

  it('bloquea el formulario mientras se envía', () => {
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();

    expect(element.querySelector('fieldset')!.disabled).toBeTrue();
    expect(element.querySelector('button[type="submit"]')!.textContent).toContain('Ingresando');
  });

  it('permite mostrar y ocultar la contraseña', () => {
    const campo = element.querySelector<HTMLInputElement>('#contrasena')!;
    expect(campo.type).toBe('password');

    element.querySelector<HTMLButtonElement>('.field__toggle')!.click();
    fixture.detectChanges();

    expect(campo.type).toBe('text');
  });
});
