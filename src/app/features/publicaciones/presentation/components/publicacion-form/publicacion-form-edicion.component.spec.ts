import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActualizarPublicacion,
  CatalogoItem,
  Publicacion,
} from '../../../domain/models/publicacion';
import { PublicacionFormComponent } from './publicacion-form.component';

describe('PublicacionFormComponent (modo editar)', () => {
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
    estado: 'BORRADOR',
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
    motivoBloqueo: null,
  };

  let fixture: ComponentFixture<PublicacionFormComponent>;
  let element: HTMLElement;
  let guardados: ActualizarPublicacion[];
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
    guardados = [];
    cancelaciones = 0;
    fixture.componentRef.setInput('modo', 'editar');
    fixture.componentRef.setInput('ciudades', CIUDADES);
    fixture.componentRef.setInput('tipos', TIPOS);
    fixture.componentRef.setInput('valoresIniciales', PUBLICACION);
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    fixture.componentInstance.guardarCambios.subscribe((datos) => guardados.push(datos));
    fixture.componentInstance.cancelar.subscribe(() => cancelaciones++);
    fixture.detectChanges();
  };

  describe('precarga', () => {
    beforeEach(() => crear());

    it('llena los textos y los números con los valores de la publicación', () => {
      expect(campo('titulo').value).toBe('Apartamento luminoso');
      expect(campo('descripcion').value).toBe('Cerca del parque');
      expect(campo('direccionTextual').value).toBe('Calle 10 # 5-20');
      expect(campo('barrioZona').value).toBe('Chapinero');
      expect(campo('capacidad').value).toBe('4');
      expect(campo('precioNoche').value).toBe('250000.5');
      expect(campo('tarifaLimpieza').value).toBe('30000');
      expect(campo('reglas').value).toBe('No fumar');
    });

    it('marca la ciudad y el tipo con los ids de la publicación', () => {
      const ciudad = campo('idCiudad') as HTMLSelectElement;
      expect(ciudad.options[ciudad.selectedIndex].textContent?.trim()).toBe('Cali');

      const marcado = element.querySelector<HTMLLabelElement>('.chip:has(input:checked)');
      expect(marcado?.textContent).toContain('Casa');
    });

    it('un barrio o unas reglas nulos quedan vacíos', () => {
      crear({ valoresIniciales: { ...PUBLICACION, barrioZona: null, reglas: null } });

      expect(campo('barrioZona').value).toBe('');
      expect(campo('reglas').value).toBe('');
    });

    it('queda sin cambios hasta que la persona escribe', () => {
      expect(fixture.componentInstance.hayCambios()).toBeFalse();

      escribir('titulo', 'Otro título');

      expect(fixture.componentInstance.hayCambios()).toBeTrue();
    });

    it('vuelve a llenarse y queda sin cambios si llega una publicación nueva', () => {
      escribir('titulo', 'Otro título');

      fixture.componentRef.setInput('valoresIniciales', { ...PUBLICACION, titulo: 'Guardado' });
      fixture.detectChanges();

      expect(campo('titulo').value).toBe('Guardado');
      expect(fixture.componentInstance.hayCambios()).toBeFalse();
    });
  });

  describe('campos propios de la edición', () => {
    it('muestra la tarifa de limpieza y las reglas con su contador', () => {
      crear();

      expect(campo('tarifaLimpieza')).not.toBeNull();
      expect(campo('reglas')).not.toBeNull();
      expect(element.querySelector('#reglas-contador')!.textContent!.trim()).toBe('8/2000');
    });

    it('mantiene los contadores de título, descripción, dirección y barrio', () => {
      crear();

      const contador = (id: string) =>
        element.querySelector(`#${id}-contador`)!.textContent!.trim();
      expect(contador('titulo')).toBe('20/150');
      expect(contador('descripcion')).toBe('16/1000');
      expect(contador('direccionTextual')).toBe('15/250');
      expect(contador('barrioZona')).toBe('9/120');
    });

    it('al crear no existen y no bloquean el formulario', () => {
      fixture = TestBed.createComponent(PublicacionFormComponent);
      element = fixture.nativeElement;
      fixture.componentRef.setInput('ciudades', CIUDADES);
      fixture.componentRef.setInput('tipos', TIPOS);
      fixture.detectChanges();

      expect(element.querySelector('#tarifaLimpieza')).toBeNull();
      expect(element.querySelector('#reglas')).toBeNull();
    });
  });

  describe('validaciones', () => {
    beforeEach(() => crear());

    it('la tarifa de limpieza acepta 0 y decimales', () => {
      for (const valida of ['0', '0.00', '15000.5']) {
        escribir('tarifaLimpieza', valida);
        expect(textoError('tarifaLimpieza')).toBeUndefined();
      }
    });

    it('la tarifa de limpieza rechaza negativos, más de 2 decimales y texto', () => {
      for (const invalida of ['-1', '100.555', 'abc', '12,5']) {
        escribir('tarifaLimpieza', invalida);
        expect(textoError('tarifaLimpieza')).toContain('igual o mayor que 0');
      }
    });

    it('la tarifa de limpieza es obligatoria', () => {
      escribir('tarifaLimpieza', '');

      expect(textoError('tarifaLimpieza')).toBe('La tarifa de limpieza es obligatoria');
      expect(botonGuardar()!.disabled).toBeTrue();
    });

    it('las reglas admiten 2000 caracteres y no más', () => {
      escribir('reglas', 'a'.repeat(2000));
      expect(textoError('reglas')).toBeUndefined();

      escribir('reglas', 'a'.repeat(2001));
      expect(textoError('reglas')).toBe('Las reglas admiten máximo 2000 caracteres');
      expect(botonGuardar()!.disabled).toBeTrue();
    });

    it('las reglas son opcionales', () => {
      escribir('reglas', '');

      expect(botonGuardar()!.disabled).toBeFalse();
    });

    it('la capacidad rechaza 0 y decimales', () => {
      for (const invalida of ['0', '2.5']) {
        escribir('capacidad', invalida);
        expect(textoError('capacidad')).toBe('La capacidad debe ser un número entero mayor que 0');
      }
    });

    it('el precio por noche rechaza 0', () => {
      escribir('precioNoche', '0');

      expect(textoError('precioNoche')).toBe('El precio por noche debe ser mayor que 0');
    });
  });

  describe('guardar', () => {
    it('emite todos los campos, con los números como número', () => {
      crear();

      enviar();

      expect(guardados).toEqual([
        {
          titulo: 'Apartamento luminoso',
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
      ]);
      expect(typeof guardados[0].capacidad).toBe('number');
      expect(typeof guardados[0].tarifaLimpieza).toBe('number');
    });

    it('emite los cambios que hizo la persona', () => {
      crear();
      escribir('tarifaLimpieza', '0');
      escribir('reglas', '');

      enviar();

      expect(guardados[0].tarifaLimpieza).toBe(0);
      expect(guardados[0].reglas).toBe('');
    });

    it('con datos inválidos no emite y marca los errores', () => {
      crear();
      escribir('capacidad', '0');

      enviar();

      expect(guardados).toEqual([]);
      expect(textoError('capacidad')).toBeTruthy();
    });

    it('el botón queda deshabilitado mientras se envía', () => {
      crear({ enviando: true });

      expect(botonGuardar()!.disabled).toBeTrue();
      expect(botonGuardar()!.textContent).toContain('Guardando');
      enviar();
      expect(guardados).toEqual([]);
    });

    it('el botón dice "Guardar cambios"', () => {
      crear();

      expect(botonGuardar()!.textContent).toContain('Guardar cambios');
    });
  });

  describe('errores del servidor (400)', () => {
    it('muestra cada error en su campo sin borrar lo escrito', () => {
      crear();
      escribir('capacidad', '0');
      escribir('tarifaLimpieza', '10');

      fixture.componentRef.setInput('erroresServidor', {
        capacidad: 'La capacidad debe ser un número entero mayor que 0',
        tarifaLimpieza: 'La tarifa de limpieza no puede ser negativa',
        reglas: 'Reglas no válidas',
      });
      fixture.detectChanges();

      expect(textoError('capacidad')).toBe('La capacidad debe ser un número entero mayor que 0');
      expect(textoError('tarifaLimpieza')).toBe('La tarifa de limpieza no puede ser negativa');
      expect(textoError('reglas')).toBe('Reglas no válidas');
      expect(campo('capacidad').value).toBe('0');
      expect(campo('tarifaLimpieza').value).toBe('10');
      expect(campo('titulo').value).toBe('Apartamento luminoso');
    });
  });

  describe('solo lectura', () => {
    beforeEach(() => crear({ soloLectura: true }));

    it('deshabilita los campos y muestra los datos', () => {
      expect(element.querySelector('fieldset')!.disabled).toBeTrue();
      expect(campo('titulo').value).toBe('Apartamento luminoso');
    });

    it('no ofrece guardar, solo volver', () => {
      expect(botonGuardar()).toBeNull();

      const volver = Array.from(element.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Volver'),
      )!;
      volver.click();

      expect(cancelaciones).toBe(1);
    });

    it('no emite aunque se fuerce el envío', () => {
      enviar();

      expect(guardados).toEqual([]);
    });
  });

  it('Cancelar emite cancelar', () => {
    crear();

    Array.from(element.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Cancelar'))!
      .click();

    expect(cancelaciones).toBe(1);
  });
});
