import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CatalogoItem,
  IntervencionPublicacion,
  Publicacion,
} from '../../../domain/models/publicacion';
import { PublicacionFormComponent } from './publicacion-form.component';

describe('PublicacionFormComponent (modo intervenir)', () => {
  const CIUDADES: CatalogoItem[] = [
    { id: 1, nombre: 'Bogotá' },
    { id: 4, nombre: 'Cali' },
  ];
  const TIPOS: CatalogoItem[] = [
    { id: 10, nombre: 'Apartamento' },
    { id: 20, nombre: 'Casa' },
  ];
  const PUBLICACION: Publicacion = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'BLOQUEADA',
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: 'Chapinero',
    ciudad: { id: 4, nombre: 'Cali' },
    tipo: { id: 20, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000.5,
    tarifaLimpieza: 30000,
    reglas: 'No fumar',
  };

  let fixture: ComponentFixture<PublicacionFormComponent>;
  let element: HTMLElement;
  let intervenciones: IntervencionPublicacion[];
  let cancelaciones: number;

  const campo = (id: string) =>
    element.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`#${id}`)!;
  const escribir = (id: string, valor: string) => {
    const elemento = campo(id) as HTMLInputElement;
    elemento.value = valor;
    elemento.dispatchEvent(new Event('input'));
    elemento.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const textoError = (id: string) => element.querySelector(`#${id}-error`)?.textContent?.trim();
  const botonGuardar = () => element.querySelector<HTMLButtonElement>('button[type="submit"]');
  const enviar = () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const crear = (entradas: Record<string, unknown> = {}) => {
    fixture = TestBed.createComponent(PublicacionFormComponent);
    element = fixture.nativeElement;
    intervenciones = [];
    cancelaciones = 0;
    fixture.componentRef.setInput('modo', 'intervenir');
    fixture.componentRef.setInput('ciudades', CIUDADES);
    fixture.componentRef.setInput('tipos', TIPOS);
    fixture.componentRef.setInput('valoresIniciales', PUBLICACION);
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    fixture.componentInstance.guardarIntervencion.subscribe((datos) => intervenciones.push(datos));
    fixture.componentInstance.cancelar.subscribe(() => cancelaciones++);
    fixture.detectChanges();
  };

  describe('campos', () => {
    beforeEach(() => crear());

    it('precarga la publicación y muestra tarifa, reglas y el motivo', () => {
      expect(campo('titulo').value).toBe('Apartamento luminoso');
      expect(campo('tarifaLimpieza').value).toBe('30000');
      expect(campo('reglas').value).toBe('No fumar');
      expect(campo('motivo')).not.toBeNull();
      expect(campo('motivo').value).toBe('');
    });

    it('el motivo tiene contador N/500', () => {
      expect(element.querySelector('#motivo-contador')!.textContent!.trim()).toBe('0/500');

      escribir('motivo', 'Corrección de la dirección');

      expect(element.querySelector('#motivo-contador')!.textContent!.trim()).toBe('26/500');
    });

    it('avisa que el motivo queda registrado junto con quién interviene y cuándo', () => {
      expect(element.querySelector('#sec-motivo')!.parentElement!.textContent).toContain(
        'Queda registrado en la auditoría junto con quién interviene y cuándo',
      );
    });

    it('el botón dice "Guardar intervención"', () => {
      expect(botonGuardar()!.textContent).toContain('Guardar intervención');
    });

    it('en los otros modos el motivo no existe', () => {
      fixture = TestBed.createComponent(PublicacionFormComponent);
      element = fixture.nativeElement;
      fixture.componentRef.setInput('modo', 'editar');
      fixture.componentRef.setInput('valoresIniciales', PUBLICACION);
      fixture.detectChanges();

      expect(element.querySelector('#motivo')).toBeNull();
    });
  });

  describe('validación del motivo', () => {
    beforeEach(() => crear());

    it('es obligatorio: sin motivo no se puede guardar', () => {
      expect(botonGuardar()!.disabled).toBeTrue();

      escribir('motivo', '');
      expect(textoError('motivo')).toBe('El motivo de la intervención es obligatorio');

      escribir('motivo', '          ');
      expect(textoError('motivo')).toBe('El motivo de la intervención es obligatorio');
    });

    it('rechaza menos de 10 caracteres', () => {
      escribir('motivo', 'muy corto');

      expect(textoError('motivo')).toBe('El motivo debe tener entre 10 y 500 caracteres');
      expect(botonGuardar()!.disabled).toBeTrue();
    });

    it('acepta exactamente 10 y exactamente 500 caracteres', () => {
      escribir('motivo', 'a'.repeat(10));
      expect(textoError('motivo')).toBeUndefined();
      expect(botonGuardar()!.disabled).toBeFalse();

      escribir('motivo', 'a'.repeat(500));
      expect(textoError('motivo')).toBeUndefined();
      expect(botonGuardar()!.disabled).toBeFalse();
    });

    it('rechaza más de 500 caracteres', () => {
      escribir('motivo', 'a'.repeat(501));

      expect(textoError('motivo')).toBe('El motivo debe tener entre 10 y 500 caracteres');
      expect(botonGuardar()!.disabled).toBeTrue();
    });
  });

  describe('guardar', () => {
    it('emite { motivo, cambios } con todos los campos y los números como número', () => {
      crear();
      escribir('titulo', 'Título corregido');
      escribir('motivo', 'Corrección del título reportada');

      enviar();

      expect(intervenciones).toEqual([
        {
          motivo: 'Corrección del título reportada',
          cambios: {
            titulo: 'Título corregido',
            descripcion: 'Cerca del parque',
            direccionTextual: 'Calle 10 # 5-20',
            idCiudad: 4,
            barrioZona: 'Chapinero',
            idTipo: 20,
            capacidad: 4,
            precioNoche: 250000.5,
            tarifaLimpieza: 30000,
            reglas: 'No fumar',
          },
        },
      ]);
      expect(typeof intervenciones[0].cambios.capacidad).toBe('number');
      expect(typeof intervenciones[0].cambios.tarifaLimpieza).toBe('number');
    });

    it('sin motivo no emite y marca el error', () => {
      crear();

      enviar();

      expect(intervenciones).toEqual([]);
      expect(textoError('motivo')).toBe('El motivo de la intervención es obligatorio');
    });

    it('con datos inválidos (capacidad 0) no emite', () => {
      crear();
      escribir('motivo', 'Corrección de capacidad');
      escribir('capacidad', '0');

      enviar();

      expect(intervenciones).toEqual([]);
      expect(textoError('capacidad')).toBe('La capacidad debe ser un número entero mayor que 0');
    });

    it('el botón queda deshabilitado mientras se envía', () => {
      crear({ enviando: true });

      expect(botonGuardar()!.disabled).toBeTrue();
      expect(botonGuardar()!.textContent).toContain('Guardando');
    });
  });

  describe('reglas obligatorias (publicación en revisión)', () => {
    it('con reglasObligatorias, vaciar las reglas lo impide y lo explica', () => {
      crear({ reglasObligatorias: true });
      escribir('motivo', 'Corrección de la publicación');

      escribir('reglas', '');

      expect(textoError('reglas')).toBe(
        'Las reglas son obligatorias para una publicación en revisión',
      );
      expect(botonGuardar()!.disabled).toBeTrue();
    });

    it('con reglasObligatorias y reglas escritas se puede guardar', () => {
      crear({ reglasObligatorias: true });
      escribir('motivo', 'Corrección de la publicación');

      expect(botonGuardar()!.disabled).toBeFalse();
    });

    it('marca las reglas con asterisco cuando son obligatorias', () => {
      crear({ reglasObligatorias: true });

      expect(element.querySelector('label[for="reglas"]')!.textContent).toContain('*');
    });

    it('sin reglasObligatorias las reglas siguen siendo opcionales', () => {
      crear();
      escribir('motivo', 'Corrección de la publicación');

      escribir('reglas', '');

      expect(textoError('reglas')).toBeUndefined();
      expect(botonGuardar()!.disabled).toBeFalse();
      expect(element.querySelector('label[for="reglas"]')!.textContent).not.toContain('*');
    });
  });

  describe('errores del servidor (400)', () => {
    it('muestra cada error en su campo, también el del motivo, sin borrar lo escrito', () => {
      crear();
      escribir('motivo', 'Corrección del título');
      escribir('titulo', 'Título de la persona');

      fixture.componentRef.setInput('erroresServidor', {
        motivo: 'El motivo debe tener entre 10 y 500 caracteres',
        capacidad: 'La capacidad debe ser un número entero mayor que 0',
        idCiudad: 'La ciudad no existe',
      });
      fixture.detectChanges();

      expect(textoError('motivo')).toBe('El motivo debe tener entre 10 y 500 caracteres');
      expect(textoError('capacidad')).toBe('La capacidad debe ser un número entero mayor que 0');
      expect(textoError('idCiudad')).toBe('La ciudad no existe');
      expect(campo('motivo').value).toBe('Corrección del título');
      expect(campo('titulo').value).toBe('Título de la persona');
    });
  });

  describe('solo lectura', () => {
    beforeEach(() => crear({ soloLectura: true }));

    it('deshabilita los campos y no ofrece guardar, solo volver', () => {
      expect(element.querySelector('fieldset')!.disabled).toBeTrue();
      expect(botonGuardar()).toBeNull();
      expect(element.querySelector('.resumen__nota')!.textContent).toContain(
        'no se puede intervenir ahora',
      );

      Array.from(element.querySelectorAll('button'))
        .find((b) => b.textContent?.includes('Volver'))!
        .click();
      expect(cancelaciones).toBe(1);
    });

    it('no emite aunque se fuerce el envío', () => {
      enviar();

      expect(intervenciones).toEqual([]);
    });
  });
});
