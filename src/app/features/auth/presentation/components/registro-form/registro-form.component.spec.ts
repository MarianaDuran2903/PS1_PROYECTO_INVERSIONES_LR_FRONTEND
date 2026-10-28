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
  const escribirYRevisar = (id: string, valor: string) => {
    escribir(id, valor);
    fixture.detectChanges();
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
    expect(textoError('confirmarContrasena')).toBe('La confirmación no coincide con la contraseña');
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
        confirmarContrasena: 'Segura#2026',
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

  it('rechaza nombres con separadores mal puestos y acepta los válidos', () => {
    for (const invalido of ['-Ana', 'Ana--Lucía', 'Ana  María', 'Ana ']) {
      escribirYRevisar('primerNombre', invalido);
      // "Ana " se recorta antes de validar, así que es válido: solo los demás deben fallar.
      if (invalido.trim() === 'Ana') {
        expect(textoError('primerNombre')).toBeUndefined();
      } else {
        expect(textoError('primerNombre')).toBe(
          'Solo se permiten letras, espacios, guion o apóstrofe',
        );
      }
    }
    for (const valido of ['María José', 'Ana-Lucía', "D'Angelo"]) {
      escribirYRevisar('primerNombre', valido);
      expect(textoError('primerNombre')).toBeUndefined();
    }
  });

  it('usa el mensaje de largo del backend y exige los requisitos de la contraseña', () => {
    escribirYRevisar('contrasena', 'Ab#1');
    expect(textoError('contrasena')).toBe('La contraseña debe tener entre 8 y 64 caracteres');

    escribirYRevisar('contrasena', 'Segura 123#');
    expect(textoError('contrasena')).toBe(
      'La contraseña debe tener al menos una mayúscula, una minúscula, un número y un carácter especial, sin espacios',
    );

    escribirYRevisar('contrasena', 'Segura#123');
    expect(textoError('contrasena')).toBeUndefined();
  });

  it('el error del servidor queda en el control con la clave "servidor"', () => {
    fixture.componentRef.setInput('erroresServidor', { primerNombre: 'Nombre no permitido' });
    fixture.detectChanges();

    expect(textoError('primerNombre')).toBe('Nombre no permitido');
  });

  it('deshabilita los campos mientras se envía', () => {
    fixture.componentRef.setInput('enviando', true);
    fixture.detectChanges();

    expect(element.querySelector('fieldset')!.disabled).toBeTrue();
    expect(element.querySelector('button[type="submit"]')!.textContent).toContain('Creando cuenta');
  });
});
