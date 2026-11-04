import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CatalogoItem, NuevaPublicacion } from '../../../domain/models/publicacion';
import { PublicacionFormComponent } from './publicacion-form.component';

describe('PublicacionFormComponent (modo crear)', () => {
  const CIUDADES: CatalogoItem[] = [
    { id: 1, nombre: 'Bogotá' },
    { id: 2, nombre: 'Medellín' },
  ];
  const TIPOS: CatalogoItem[] = [
    { id: 10, nombre: 'Apartamento' },
    { id: 20, nombre: 'Casa' },
  ];

  let fixture: ComponentFixture<PublicacionFormComponent>;
  let element: HTMLElement;
  let emitidos: NuevaPublicacion[];

  const escribir = (id: string, valor: string) => {
    const campo = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const elegirCiudad = (indice: number) => {
    const select = element.querySelector<HTMLSelectElement>('#idCiudad')!;
    select.selectedIndex = indice;
    select.dispatchEvent(new Event('change'));
    select.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };
  const elegirTipo = (nombre: string) => {
    const chips = Array.from(element.querySelectorAll<HTMLLabelElement>('.chip'));
    chips
      .find((chip) => chip.textContent?.includes(nombre))!
      .querySelector('input')!
      .click();
    fixture.detectChanges();
  };
  const completar = () => {
    escribir('titulo', 'Apartamento luminoso');
    escribir('descripcion', 'Cerca del parque');
    escribir('direccionTextual', 'Calle 10 # 5-20');
    elegirCiudad(1);
    elegirTipo('Apartamento');
    escribir('capacidad', '4');
    escribir('precioNoche', '250000.50');
  };
  const guardar = () => element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const enviar = () => {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  };
  const textoError = (id: string) => element.querySelector(`#${id}-error`)?.textContent?.trim();

  beforeEach(() => {
    fixture = TestBed.createComponent(PublicacionFormComponent);
    element = fixture.nativeElement;
    emitidos = [];
    fixture.componentRef.setInput('ciudades', CIUDADES);
    fixture.componentRef.setInput('tipos', TIPOS);
    fixture.componentInstance.guardar.subscribe((datos) => emitidos.push(datos));
    fixture.detectChanges();
  });

  it('cada tipo lleva el icono SVG que lo representa', () => {
    const iconos = Array.from(element.querySelectorAll('.chip svg'), (s) =>
      s.getAttribute('data-icono'),
    );

    expect(iconos).toEqual(['apartamento', 'casa']);
  });

  it('ofrece las ciudades en la lista desplegable y los tipos como opciones', () => {
    const ciudades = Array.from(element.querySelectorAll('#idCiudad option'), (o) =>
      o.textContent?.trim(),
    );
    const tipos = Array.from(element.querySelectorAll('.chip__texto'), (t) =>
      t.textContent?.trim(),
    );

    expect(ciudades).toEqual(['Selecciona una ciudad', 'Bogotá', 'Medellín']);
    expect(tipos).toEqual(['Apartamento', 'Casa']);
  });

  describe('botón Guardar', () => {
    it('está deshabilitado mientras el formulario sea inválido', () => {
      expect(guardar().disabled).toBeTrue();

      escribir('titulo', 'Solo el título');
      expect(guardar().disabled).toBeTrue();
    });

    it('se habilita cuando todos los datos son válidos', () => {
      completar();

      expect(guardar().disabled).toBeFalse();
    });

    it('se deshabilita mientras se envía', () => {
      completar();
      fixture.componentRef.setInput('enviando', true);
      fixture.detectChanges();

      expect(guardar().disabled).toBeTrue();
      expect(guardar().textContent).toContain('Guardando');
    });
  });

  describe('envío', () => {
    it('emite los datos correctos, con capacidad y precio como números', () => {
      completar();
      escribir('barrioZona', 'Chapinero');

      enviar();

      expect(emitidos).toEqual([
        {
          titulo: 'Apartamento luminoso',
          descripcion: 'Cerca del parque',
          direccionTextual: 'Calle 10 # 5-20',
          idCiudad: 1,
          barrioZona: 'Chapinero',
          idTipo: 10,
          capacidad: 4,
          precioNoche: 250000.5,
        },
      ]);
      expect(typeof emitidos[0].capacidad).toBe('number');
      expect(typeof emitidos[0].precioNoche).toBe('number');
    });

    it('el tipo elegido llega como número, no como texto', () => {
      completar();
      elegirTipo('Casa');

      enviar();

      expect(emitidos[0].idTipo).toBe(20);
    });

    it('no emite con el formulario inválido y enfoca el primer campo con error', () => {
      enviar();

      expect(emitidos).toEqual([]);
      expect(textoError('titulo')).toBe('El título es obligatorio');
      expect(document.activeElement?.id).toBe('titulo');
    });

    it('no emite mientras hay un envío en curso', () => {
      completar();
      fixture.componentRef.setInput('enviando', true);
      fixture.detectChanges();

      enviar();

      expect(emitidos).toEqual([]);
    });
  });

  describe('validaciones y mensajes', () => {
    it('muestra los mensajes de los campos obligatorios vacíos', () => {
      for (const id of ['titulo', 'descripcion', 'direccionTextual', 'capacidad', 'precioNoche']) {
        escribir(id, '');
      }
      elegirCiudad(0);
      element.querySelector('.chip input')!.dispatchEvent(new Event('blur'));
      enviar();

      expect(textoError('titulo')).toBe('El título es obligatorio');
      expect(textoError('descripcion')).toBe('La descripción es obligatoria');
      expect(textoError('direccionTextual')).toBe('La dirección es obligatoria');
      expect(textoError('idCiudad')).toBe('La ciudad es obligatoria');
      expect(textoError('idTipo')).toBe('El tipo de alojamiento es obligatorio');
      expect(textoError('capacidad')).toBe('La capacidad debe ser un número entero mayor que 0');
      expect(textoError('precioNoche')).toBe('El precio por noche debe ser mayor que 0');
    });

    it('trata los textos con solo espacios como vacíos', () => {
      escribir('titulo', '     ');

      expect(textoError('titulo')).toBe('El título es obligatorio');
    });

    it('respeta los máximos de caracteres', () => {
      escribir('titulo', 'a'.repeat(151));
      escribir('descripcion', 'a'.repeat(1001));
      escribir('direccionTextual', 'a'.repeat(251));
      escribir('barrioZona', 'a'.repeat(121));

      expect(textoError('titulo')).toBe('El título admite máximo 150 caracteres');
      expect(textoError('descripcion')).toBe('La descripción admite máximo 1000 caracteres');
      expect(textoError('direccionTextual')).toBe('La dirección admite máximo 250 caracteres');
      expect(textoError('barrioZona')).toBe('El barrio o zona admite máximo 120 caracteres');
    });

    it('acepta los máximos exactos', () => {
      escribir('titulo', 'a'.repeat(150));
      escribir('descripcion', 'a'.repeat(1000));
      escribir('direccionTextual', 'a'.repeat(250));
      escribir('barrioZona', 'a'.repeat(120));

      for (const id of ['titulo', 'descripcion', 'direccionTextual', 'barrioZona']) {
        expect(textoError(id)).toBeUndefined();
      }
    });

    it('rechaza capacidades que no son enteros mayores que 0', () => {
      for (const invalido of ['0', '-1', '2.5']) {
        escribir('capacidad', invalido);
        expect(textoError('capacidad')).toBe('La capacidad debe ser un número entero mayor que 0');
      }
      escribir('capacidad', '4');
      expect(textoError('capacidad')).toBeUndefined();
    });

    it('rechaza precios en cero, negativos o con más de 2 decimales', () => {
      for (const invalido of ['0', '-5000', '100.555', 'abc']) {
        escribir('precioNoche', invalido);
        expect(textoError('precioNoche')).toBe('El precio por noche debe ser mayor que 0');
      }
      escribir('precioNoche', '250000.50');
      expect(textoError('precioNoche')).toBeUndefined();
    });

    it('barrio o zona es opcional', () => {
      completar();

      expect(guardar().disabled).toBeFalse();
    });
  });

  describe('presentación', () => {
    it('muestra el contador de la descripción como N/1000', () => {
      expect(element.querySelector('#descripcion-contador')!.textContent!.trim()).toBe('0/1000');

      escribir('descripcion', 'Cerca del parque');

      expect(element.querySelector('#descripcion-contador')!.textContent!.trim()).toBe('16/1000');
    });

    it('muestra el precio en pesos colombianos sin cambiar el valor que se envía', () => {
      completar();

      expect(element.querySelector('#precioNoche-ayuda')!.textContent).toMatch(/250\.000,5/);
      enviar();
      expect(emitidos[0].precioNoche).toBe(250000.5);
    });

    it('el resumen lateral refleja lo que se va escribiendo', () => {
      completar();

      const resumen = element.querySelector('.resumen')!.textContent!;
      expect(resumen).toContain('Apartamento luminoso');
      expect(resumen).toContain('Bogotá');
      expect(resumen).toContain('Apartamento');
      expect(resumen).toContain('4 huéspedes');
      expect(resumen).toMatch(/250\.000,5/);
    });

    it('el resumen usa singular con un huésped y guiones mientras no hay datos', () => {
      expect(element.querySelector('.resumen')!.textContent).toContain('Título de tu publicación');

      escribir('capacidad', '1');

      expect(element.querySelector('.resumen')!.textContent).toContain('1 huésped');
    });
  });

  describe('errores del servidor', () => {
    it('muestra cada mensaje de un 400 debajo de su control', () => {
      fixture.componentRef.setInput('erroresServidor', {
        titulo: 'Título no permitido',
        descripcion: 'Descripción no permitida',
        direccionTextual: 'Dirección no válida',
        idCiudad: 'La ciudad no existe',
        barrioZona: 'Barrio no válido',
        idTipo: 'El tipo no existe',
        capacidad: 'Capacidad no válida',
        precioNoche: 'Precio no válido',
      });
      fixture.detectChanges();

      expect(textoError('titulo')).toBe('Título no permitido');
      expect(textoError('descripcion')).toBe('Descripción no permitida');
      expect(textoError('direccionTextual')).toBe('Dirección no válida');
      expect(textoError('idCiudad')).toBe('La ciudad no existe');
      expect(textoError('barrioZona')).toBe('Barrio no válido');
      expect(textoError('idTipo')).toBe('El tipo no existe');
      expect(textoError('capacidad')).toBe('Capacidad no válida');
      expect(textoError('precioNoche')).toBe('Precio no válido');
    });

    it('el error del servidor se quita al corregir el campo', () => {
      fixture.componentRef.setInput('erroresServidor', { titulo: 'Título no permitido' });
      fixture.detectChanges();

      escribir('titulo', 'Otro título');

      expect(textoError('titulo')).toBeUndefined();
    });
  });
});
