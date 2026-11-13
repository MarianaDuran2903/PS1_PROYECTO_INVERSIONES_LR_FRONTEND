import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstadoPublicacion } from '../../../domain/models/publicacion';
import { AccionActivacionComponent } from './accion-activacion.component';

describe('AccionActivacionComponent', () => {
  let fixture: ComponentFixture<AccionActivacionComponent>;
  let element: HTMLElement;

  const mostrar = (estado: EstadoPublicacion, extra: Record<string, unknown> = {}) => {
    fixture = TestBed.createComponent(AccionActivacionComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('estado', estado);
    for (const [clave, valor] of Object.entries(extra)) {
      fixture.componentRef.setInput(clave, valor);
    }
    fixture.detectChanges();
  };
  const boton = () => element.querySelector<HTMLButtonElement>('button');

  it('un borrador muestra el botón "Enviar a revisión"', () => {
    mostrar('BORRADOR');

    expect(boton()?.textContent?.trim()).toBe('Enviar a revisión');
    expect(element.querySelector('.en-revision')).toBeNull();
  });

  it('una publicación en revisión muestra "En revisión del Administrador" y ningún botón', () => {
    mostrar('PENDIENTE_REVISION');

    expect(element.querySelector('.en-revision')?.textContent?.trim()).toBe(
      'En revisión del Administrador',
    );
    expect(boton()).toBeNull();
  });

  for (const estado of ['ACTIVA', 'PAUSADA', 'BLOQUEADA'] as const) {
    it(`en ${estado} no muestra nada`, () => {
      mostrar(estado);

      expect(boton()).toBeNull();
      expect(element.querySelector('.en-revision')).toBeNull();
      expect(element.textContent?.trim()).toBe('');
    });
  }

  it('al pulsar el botón emite "enviar"', () => {
    mostrar('BORRADOR');
    let emitido = 0;
    fixture.componentInstance.enviar.subscribe(() => emitido++);

    boton()!.click();

    expect(emitido).toBe(1);
  });

  it('mientras envía, el botón queda deshabilitado con indicador de carga', () => {
    mostrar('BORRADOR', { enviando: true });

    expect(boton()!.disabled).toBeTrue();
    expect(boton()!.getAttribute('aria-busy')).toBe('true');
    expect(boton()!.textContent).toContain('Enviando');
    expect(element.querySelector('.spinner')).not.toBeNull();
  });

  it('si otra publicación se está enviando, el botón espera deshabilitado', () => {
    mostrar('BORRADOR', { deshabilitado: true });

    expect(boton()!.disabled).toBeTrue();
    expect(boton()!.textContent?.trim()).toBe('Enviar a revisión');
  });

  it('usa la variante y el ancho que se le piden', () => {
    mostrar('BORRADOR', { variante: 'primary', bloque: true });

    for (const clase of ['btn', 'btn--primary', 'btn--block']) {
      expect(boton()!.classList.contains(clase)).withContext(clase).toBeTrue();
    }
    expect(boton()!.classList.contains('btn--outline')).toBeFalse();
  });
});
