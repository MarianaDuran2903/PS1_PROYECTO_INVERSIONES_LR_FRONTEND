import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Publicacion } from '../../../domain/models/publicacion';
import { PublicacionConfirmacionComponent } from './publicacion-confirmacion.component';

describe('PublicacionConfirmacionComponent', () => {
  const publicacion: Publicacion = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'BORRADOR',
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: 'Chapinero',
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Apartamento' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 0,
    reglas: null,
  };

  let fixture: ComponentFixture<PublicacionConfirmacionComponent>;
  let element: HTMLElement;

  const crear = (datos: Publicacion = publicacion, modo?: 'confirmacion' | 'detalle') => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(PublicacionConfirmacionComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('publicacion', datos);
    if (modo) {
      fixture.componentRef.setInput('modo', modo);
    }
    fixture.detectChanges();
  };

  it('avisa que se guardó como borrador y que todavía no es visible en el Marketplace', () => {
    crear();

    const aviso = element.querySelector('.ficha__aviso')!.textContent!;
    expect(aviso).toContain('Publicación guardada como borrador');
    expect(aviso).toContain('Todavía no es visible en el Marketplace');
  });

  it('muestra el estado BORRADOR', () => {
    crear();

    expect(element.querySelector('app-estado-publicacion')!.textContent!.trim()).toBe('Borrador');
  });

  it('muestra la ruta, el título, la dirección y la descripción', () => {
    crear();

    const ruta = Array.from(element.querySelectorAll('.ficha__ruta li'), (li) =>
      li.textContent?.trim(),
    );
    expect(ruta).toEqual(['Alojamientos', 'Bogotá', 'Apartamento', 'Apartamento luminoso']);
    expect(element.querySelector('h1')!.textContent).toContain('Apartamento luminoso');
    expect(element.querySelector('.ficha__direccion')!.textContent).toContain(
      'Calle 10 # 5-20, Chapinero, Bogotá',
    );
    expect(element.querySelector('.ficha__descripcion')!.textContent).toContain('Cerca del parque');
  });

  it('muestra el precio en pesos colombianos, la tarifa de limpieza y la política', () => {
    crear();

    const resumen = element.querySelector('.ficha__resumen')!.textContent!;
    expect(resumen).toMatch(/250\.000/);
    expect(resumen).toContain('por noche');
    expect(resumen).toContain('Tarifa de limpieza');
    expect(resumen).toContain('Flexible');
    expect(resumen).toContain('4 huéspedes');
  });

  it('omite el barrio cuando no hay y usa singular con un huésped', () => {
    crear({ ...publicacion, barrioZona: null, capacidad: 1 });

    expect(element.querySelector('.ficha__direccion')!.textContent).toContain(
      'Calle 10 # 5-20, Bogotá',
    );
    expect(element.textContent).not.toContain('Barrio o zona');
    expect(element.querySelector('.ficha__resumen')!.textContent).toContain('1 huésped');
  });

  it('deja claro que todavía no tiene fotos', () => {
    crear();

    expect(element.querySelector('.ficha__galeria')!.textContent).toContain('Sin fotos todavía');
  });

  it('la zona de fotos muestra el icono del tipo de alojamiento', () => {
    crear({ ...publicacion, tipo: { id: 3, nombre: 'Cabaña' } });

    expect(element.querySelector('.ficha__galeria svg')!.getAttribute('data-icono')).toBe('cabana');
  });

  describe('botón Editar', () => {
    const botonEditar = () =>
      Array.from(
        element.querySelectorAll<HTMLElement>('.ficha__resumen a, .ficha__resumen button'),
      ).find((e) => e.textContent?.includes('Editar publicación'))!;

    for (const estado of ['BORRADOR', 'PAUSADA'] as const) {
      it(`en ${estado} es un enlace activo a la pantalla de edición`, () => {
        crear({ ...publicacion, estado });

        const boton = botonEditar();
        expect(boton.tagName).toBe('A');
        expect(boton.getAttribute('href')).toBe('/anfitrion/publicaciones/9/editar');
        expect(boton.getAttribute('aria-disabled')).toBeNull();
      });
    }

    const motivos = {
      ACTIVA: 'Esta publicación está activa. Para editarla, páusala primero.',
      PENDIENTE_REVISION: 'La publicación está en revisión del Administrador.',
      BLOQUEADA: 'La publicación está bloqueada.',
    } as const;

    for (const [estado, motivo] of Object.entries(motivos)) {
      it(`en ${estado} está inactivo y el tooltip explica el motivo`, () => {
        crear({ ...publicacion, estado: estado as keyof typeof motivos });

        const boton = botonEditar();
        expect(boton.tagName).toBe('BUTTON');
        expect(boton.getAttribute('aria-disabled')).toBe('true');
        expect(boton.getAttribute('title')).toBe(motivo);
        expect(boton.getAttribute('href')).toBeNull();
      });
    }
  });

  describe('modo detalle (al abrir una publicación desde el listado)', () => {
    it('no muestra el aviso de "guardada como borrador"', () => {
      crear(publicacion, 'detalle');

      expect(element.querySelector('.ficha__aviso')).toBeNull();
      expect(element.textContent).not.toContain('Publicación guardada como borrador');
    });

    it('en vez de "Crear otra publicación" ofrece volver al listado', () => {
      crear(publicacion, 'detalle');

      expect(element.textContent).not.toContain('Crear otra publicación');
      const volver = Array.from(
        element.querySelectorAll<HTMLAnchorElement>('.ficha__resumen a'),
      ).find((a) => a.textContent?.includes('Volver a mis publicaciones'))!;
      expect(volver.getAttribute('href')).toBe('/anfitrion/publicaciones');
    });

    it('conserva los datos, el estado y el botón Editar', () => {
      crear({ ...publicacion, estado: 'PAUSADA' }, 'detalle');

      expect(element.querySelector('h1')!.textContent).toContain('Apartamento luminoso');
      expect(element.querySelector('app-estado-publicacion')!.textContent!.trim()).toBe('Pausada');
      expect(element.querySelector('app-boton-editar-publicacion a')!.getAttribute('href')).toBe(
        '/anfitrion/publicaciones/9/editar',
      );
    });

    it('la ficha de confirmación (por defecto) sigue igual', () => {
      crear(publicacion);

      expect(element.querySelector('.ficha__aviso')).not.toBeNull();
      expect(element.textContent).toContain('Crear otra publicación');
      expect(element.textContent).not.toContain('Volver a mis publicaciones');
    });
  });

  it('emite crearOtra al pulsar el botón', () => {
    crear();
    let veces = 0;
    fixture.componentInstance.crearOtra.subscribe(() => veces++);

    element.querySelector<HTMLButtonElement>('.ficha__resumen button')!.click();

    expect(veces).toBe(1);
  });

  describe('pausar (HU-014)', () => {
    const botonPausar = () =>
      Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.trim().startsWith('Pausa'),
      );

    it('en el detalle de una publicación activa muestra el botón y emite "pausar" al pulsarlo', () => {
      crear({ ...publicacion, estado: 'ACTIVA' }, 'detalle');
      let veces = 0;
      fixture.componentInstance.pausar.subscribe(() => veces++);

      botonPausar()!.click();

      expect(veces).toBe(1);
    });

    it('en el detalle muestra el indicador de carga mientras se pausa', () => {
      crear({ ...publicacion, estado: 'ACTIVA' }, 'detalle');
      fixture.componentRef.setInput('pausando', true);
      fixture.detectChanges();

      const boton = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.includes('Pausando'),
      )!;
      expect(boton.disabled).toBeTrue();
    });

    it('en el detalle de una publicación pausada muestra el texto y no el botón', () => {
      crear({ ...publicacion, estado: 'PAUSADA' }, 'detalle');

      expect(botonPausar()).toBeUndefined();
      expect(element.querySelector('.ficha__resumen')!.textContent).toContain(
        'El Administrador revisará tus ajustes antes de reactivarla',
      );
    });

    it('en un borrador no ofrece pausar', () => {
      crear(publicacion, 'detalle');

      expect(botonPausar()).toBeUndefined();
    });

    it('justo después de crear (modo confirmación) no ofrece pausar', () => {
      crear({ ...publicacion, estado: 'ACTIVA' }, 'confirmacion');

      expect(botonPausar()).toBeUndefined();
    });
  });

  describe('enviar a revisión (HU-012)', () => {
    const botonEnviar = () =>
      Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.includes('Enviar a revisión'),
      );

    it('en el detalle de un borrador muestra el botón y emite "enviarARevision" al pulsarlo', () => {
      crear(publicacion, 'detalle');
      let veces = 0;
      fixture.componentInstance.enviarARevision.subscribe(() => veces++);

      botonEnviar()!.click();

      expect(veces).toBe(1);
    });

    it('en el detalle muestra el indicador de carga mientras se envía', () => {
      crear(publicacion, 'detalle');
      fixture.componentRef.setInput('enviandoRevision', true);
      fixture.detectChanges();

      const boton = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
        b.textContent?.includes('Enviando'),
      )!;
      expect(boton.disabled).toBeTrue();
    });

    it('en el detalle de una publicación en revisión muestra el texto y no el botón', () => {
      crear({ ...publicacion, estado: 'PENDIENTE_REVISION' }, 'detalle');

      expect(botonEnviar()).toBeUndefined();
      expect(element.querySelector('.ficha__resumen')!.textContent).toContain(
        'En revisión del Administrador',
      );
    });

    it('justo después de crear (modo confirmación) no ofrece enviar a revisión', () => {
      crear(publicacion, 'confirmacion');

      expect(botonEnviar()).toBeUndefined();
    });
  });

  it('no dice que es un borrador si el estado es otro', () => {
    crear({ ...publicacion, estado: 'ACTIVA' });

    expect(element.querySelector('app-estado-publicacion')!.textContent!.trim()).toBe('Activa');
    expect(element.querySelector('.ficha__nota')).toBeNull();
  });
});
