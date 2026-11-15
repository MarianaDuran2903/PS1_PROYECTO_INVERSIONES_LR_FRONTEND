import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EstadoPublicacion } from '../../../domain/models/publicacion';
import { BotonEditarPublicacionComponent } from './boton-editar-publicacion.component';

describe('BotonEditarPublicacionComponent', () => {
  let fixture: ComponentFixture<BotonEditarPublicacionComponent>;
  let element: HTMLElement;

  const crear = (estado: EstadoPublicacion, entradas: Record<string, unknown> = {}) => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(BotonEditarPublicacionComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('idPublicacion', 9);
    fixture.componentRef.setInput('estado', estado);
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    fixture.detectChanges();
    return (element.querySelector('a, button') as HTMLElement)!;
  };

  for (const estado of ['BORRADOR', 'PAUSADA'] as const) {
    it(`en ${estado} es un enlace activo a la edición`, () => {
      const boton = crear(estado);

      expect(boton.tagName).toBe('A');
      expect(boton.getAttribute('href')).toBe('/anfitrion/publicaciones/9/editar');
      expect(boton.getAttribute('aria-disabled')).toBeNull();
      expect(boton.getAttribute('title')).toBeNull();
    });
  }

  const motivos = {
    ACTIVA: 'Esta publicación está activa. Para editarla, páusala primero.',
    PENDIENTE_REVISION: 'La publicación está en revisión del Administrador.',
    BLOQUEADA: 'La publicación está bloqueada.',
  } as const;

  for (const [estado, motivo] of Object.entries(motivos)) {
    it(`en ${estado} está deshabilitado y el tooltip explica el motivo`, () => {
      const boton = crear(estado as keyof typeof motivos);

      expect(boton.tagName).toBe('BUTTON');
      expect(boton.getAttribute('aria-disabled')).toBe('true');
      expect(boton.getAttribute('title')).toBe(motivo);
      expect(boton.getAttribute('href')).toBeNull();
      expect(boton.classList).toContain('inactivo');
    });
  }

  it('el botón deshabilitado no navega ni hace nada al pulsarlo', () => {
    const boton = crear('ACTIVA');
    const evento = new MouseEvent('click', { cancelable: true });

    boton.dispatchEvent(evento);

    expect(evento.defaultPrevented).toBeTrue();
  });

  it('usa el texto, la variante y el ancho que se le piden', () => {
    const boton = crear('BORRADOR', { texto: 'Editar', variante: 'primary', bloque: true });

    expect(boton.textContent!.trim()).toBe('Editar');
    expect(boton.classList).toContain('btn--primary');
    expect(boton.classList).toContain('btn--block');
  });

  it('por defecto dice "Editar publicación" y es de contorno', () => {
    const boton = crear('BORRADOR');

    expect(boton.textContent!.trim()).toBe('Editar publicación');
    expect(boton.classList).toContain('btn--outline');
    expect(boton.classList).not.toContain('btn--block');
  });
});
