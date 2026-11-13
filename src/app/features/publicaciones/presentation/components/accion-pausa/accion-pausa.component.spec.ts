import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstadoPublicacion } from '../../../domain/models/publicacion';
import { AccionPausaComponent } from './accion-pausa.component';

describe('AccionPausaComponent', () => {
  let fixture: ComponentFixture<AccionPausaComponent>;
  let element: HTMLElement;

  const mostrar = (estado: EstadoPublicacion, extra: Record<string, unknown> = {}) => {
    fixture = TestBed.createComponent(AccionPausaComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('estado', estado);
    for (const [clave, valor] of Object.entries(extra)) {
      fixture.componentRef.setInput(clave, valor);
    }
    fixture.detectChanges();
  };
  const boton = () => element.querySelector<HTMLButtonElement>('button');

  it('una publicación activa muestra el botón "Pausar"', () => {
    mostrar('ACTIVA');

    expect(boton()?.textContent?.trim()).toBe('Pausar');
    expect(element.querySelector('.pausada')).toBeNull();
  });

  it('una publicación pausada muestra que el Administrador revisará los ajustes, sin botón', () => {
    mostrar('PAUSADA');

    expect(element.querySelector('.pausada')?.textContent?.trim()).toBe(
      'El Administrador revisará tus ajustes antes de reactivarla',
    );
    expect(boton()).toBeNull();
  });

  for (const estado of ['BORRADOR', 'PENDIENTE_REVISION', 'BLOQUEADA'] as const) {
    it(`en ${estado} no muestra nada`, () => {
      mostrar(estado);

      expect(boton()).toBeNull();
      expect(element.querySelector('.pausada')).toBeNull();
      expect(element.textContent?.trim()).toBe('');
    });
  }

  it('al pulsar el botón emite "pausar"', () => {
    mostrar('ACTIVA');
    let emitido = 0;
    fixture.componentInstance.pausar.subscribe(() => emitido++);

    boton()!.click();

    expect(emitido).toBe(1);
  });

  it('mientras pausa, el botón queda deshabilitado con indicador de carga', () => {
    mostrar('ACTIVA', { pausando: true });

    expect(boton()!.disabled).toBeTrue();
    expect(boton()!.getAttribute('aria-busy')).toBe('true');
    expect(boton()!.textContent).toContain('Pausando');
    expect(element.querySelector('.spinner')).not.toBeNull();
  });

  it('si otra acción está en curso, el botón espera deshabilitado', () => {
    mostrar('ACTIVA', { deshabilitado: true });

    expect(boton()!.disabled).toBeTrue();
    expect(boton()!.textContent?.trim()).toBe('Pausar');
  });

  it('usa la variante y el ancho que se le piden', () => {
    mostrar('ACTIVA', { variante: 'primary', bloque: true });

    for (const clase of ['btn', 'btn--primary', 'btn--block']) {
      expect(boton()!.classList.contains(clase)).withContext(clase).toBeTrue();
    }
    expect(boton()!.classList.contains('btn--outline')).toBeFalse();
  });
});
