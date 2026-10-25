import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegistroUsuario } from '../../../domain/models/registro-usuario';
import { RegistroFormComponent } from './registro-form.component';

describe('RegistroFormComponent', () => {
  let fixture: ComponentFixture<RegistroFormComponent>;
  let element: HTMLElement;
  let emitidos: RegistroUsuario[];

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
    fixture = TestBed.createComponent(RegistroFormComponent);
    element = fixture.nativeElement;
    emitidos = [];
    fixture.componentInstance.registrar.subscribe((datos) => emitidos.push(datos));
    fixture.detectChanges();
  });

  it('no emite y muestra errores específicos si faltan datos obligatorios', () => {
    enviar();

    expect(emitidos).toEqual([]);
    expect(textoError('primerNombre')).toBe('Este campo es obligatorio.');
    expect(textoError('correo')).toBe('Este campo es obligatorio.');
    expect(textoError('contrasena')).toBe('Este campo es obligatorio.');
    expect(document.activeElement?.id).toBe('primerNombre');
  });

  it('muestra errores de formato, contraseña débil y confirmación distinta', () => {
    escribir('primerNombre', 'Ana2');
    escribir('primerApellido', 'Ruiz');
    escribir('correo', 'ana@correo');
    escribir('contrasena', 'abcdefgh');
    escribir('confirmarContrasena', 'otra');
    enviar();

    expect(emitidos).toEqual([]);
    expect(textoError('primerNombre')).toContain('Solo se permiten letras');
    expect(textoError('correo')).toBe('Ingresa un correo electrónico válido.');
    expect(textoError('contrasena')).toContain('una mayúscula');
    expect(textoError('confirmarContrasena')).toBe('Las contraseñas no coinciden.');
  });

  it('emite los datos cuando el formulario es válido', () => {
    escribir('primerNombre', 'Ana');
    escribir('primerApellido', 'Ruiz');
    escribir('correo', 'ana@correo.com');
    escribir('contrasena', 'Segura#2026');
    escribir('confirmarContrasena', 'Segura#2026');
    enviar();

    expect(emitidos).toEqual([
      {
        rol: 'HUESPED',
        primerNombre: 'Ana',
        segundoNombre: '',
        primerApellido: 'Ruiz',
        segundoApellido: '',
        correo: 'ana@correo.com',
        contrasena: 'Segura#2026',
      },
    ]);
  });

  it('ofrece Huésped y Anfitrión, con Huésped marcado por defecto', () => {
    const radios = element.querySelectorAll<HTMLInputElement>('input[type="radio"]');

    expect(Array.from(radios, (r) => r.value)).toEqual(['HUESPED', 'ANFITRION']);
    expect(Array.from(radios, (r) => r.checked)).toEqual([true, false]);
  });

  it('emite el rol Anfitrión cuando la persona lo elige', () => {
    element.querySelector<HTMLInputElement>('input[value="ANFITRION"]')!.click();
    escribir('primerNombre', 'Luis');
    escribir('primerApellido', 'Mora');
    escribir('correo', 'luis@correo.com');
    escribir('contrasena', 'Segura#2026');
    escribir('confirmarContrasena', 'Segura#2026');
    enviar();

    expect(emitidos.map((datos) => datos.rol)).toEqual(['ANFITRION']);
  });

  it('preselecciona el rol recibido por rolInicial', () => {
    fixture.componentRef.setInput('rolInicial', 'ANFITRION');
    fixture.detectChanges();

    expect(element.querySelector<HTMLInputElement>('input[value="ANFITRION"]')!.checked).toBeTrue();
  });

  it('muestra en el campo el error enviado por el servidor', () => {
    fixture.componentRef.setInput('erroresServidor', {
      correo: 'Este correo electrónico ya está registrado.',
    });
    fixture.detectChanges();

    expect(textoError('correo')).toBe('Este correo electrónico ya está registrado.');
  });

  it('deshabilita los campos mientras se envía', () => {
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();

    expect(element.querySelector('fieldset')!.disabled).toBeTrue();
    expect(element.querySelector('button[type="submit"]')!.textContent).toContain('Creando cuenta');
  });
});
