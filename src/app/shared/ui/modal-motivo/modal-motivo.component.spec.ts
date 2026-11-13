import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalMotivoComponent } from './modal-motivo.component';

describe('ModalMotivoComponent', () => {
  const VALIDO = 'Las fotos no corresponden al alojamiento';

  let fixture: ComponentFixture<ModalMotivoComponent>;
  let element: HTMLElement;
  let confirmados: string[];
  let cancelaciones: number;

  const dialogo = () => element.querySelector<HTMLDialogElement>('dialog')!;
  const campo = () => element.querySelector<HTMLTextAreaElement>('textarea')!;
  const botonConfirmar = () => element.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const botonCancelar = () =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Cancelar'),
    )!;
  const abrir = (extra: Record<string, unknown> = {}) => {
    fixture.componentRef.setInput('abierto', true);
    for (const [clave, valor] of Object.entries(extra)) {
      fixture.componentRef.setInput(clave, valor);
    }
    fixture.detectChanges();
  };
  const escribir = (texto: string) => {
    campo().value = texto;
    campo().dispatchEvent(new Event('input'));
    campo().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(ModalMotivoComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('titulo', 'Rechazar publicación');
    fixture.componentRef.setInput('ayuda', 'Explica qué debe corregir el Anfitrión.');
    fixture.componentRef.setInput('etiqueta', 'Motivo del rechazo');
    fixture.componentRef.setInput('textoConfirmar', 'Rechazar publicación');
    confirmados = [];
    cancelaciones = 0;
    fixture.componentInstance.confirmar.subscribe((m) => confirmados.push(m));
    fixture.componentInstance.cancelar.subscribe(() => cancelaciones++);
    fixture.detectChanges();
  });

  afterEach(() => {
    if (dialogo().open) {
      dialogo().close();
    }
  });

  describe('apertura', () => {
    it('está cerrado al crearse', () => {
      expect(dialogo().open).toBeFalse();
    });

    it('se abre como diálogo modal y lleva el foco al campo de texto', () => {
      abrir();

      expect(dialogo().open).toBeTrue();
      expect(dialogo().matches(':modal')).toBeTrue();
      expect(document.activeElement).toBe(campo());
    });

    it('muestra el título, la ayuda y la etiqueta que se le piden', () => {
      abrir();

      expect(element.querySelector('h2')!.textContent).toContain('Rechazar publicación');
      expect(element.querySelector('.modal__ayuda')!.textContent).toContain(
        'Explica qué debe corregir el Anfitrión.',
      );
      expect(element.querySelector('label')!.textContent).toContain('Motivo del rechazo');
      expect(botonConfirmar().textContent).toContain('Rechazar publicación');
      expect(dialogo().getAttribute('aria-labelledby')).toBe('modal-motivo-titulo');
    });

    it('al cerrarse con "abierto" en false, se cierra el diálogo', () => {
      abrir();

      fixture.componentRef.setInput('abierto', false);
      fixture.detectChanges();

      expect(dialogo().open).toBeFalse();
    });

    it('al abrirse de nuevo empieza con el campo vacío', () => {
      abrir();
      escribir(VALIDO);
      fixture.componentRef.setInput('abierto', false);
      fixture.detectChanges();

      abrir();

      expect(campo().value).toBe('');
      expect(element.querySelector('.modal__contador')!.textContent).toContain('0/500');
    });
  });

  describe('validación del motivo (10 a 500 caracteres recortados)', () => {
    beforeEach(() => abrir());

    it('con el campo vacío el botón de confirmar está deshabilitado', () => {
      expect(botonConfirmar().disabled).toBeTrue();
    });

    it('nueve caracteres no alcanzan; diez sí', () => {
      escribir('123456789');
      expect(botonConfirmar().disabled).toBeTrue();
      expect(element.querySelector('#modal-motivo-error')!.textContent).toContain(
        'entre 10 y 500 caracteres',
      );

      escribir('1234567890');
      expect(botonConfirmar().disabled).toBeFalse();
      expect(element.querySelector('#modal-motivo-error')).toBeNull();
    });

    it('500 caracteres sirven; 501 no', () => {
      escribir('a'.repeat(500));
      expect(botonConfirmar().disabled).toBeFalse();

      escribir('a'.repeat(501));
      expect(botonConfirmar().disabled).toBeTrue();
      expect(element.querySelector('.modal__contador--excedido')).not.toBeNull();
    });

    it('los espacios alrededor no cuentan: diez espacios con tres letras no valen', () => {
      escribir('          abc          ');

      expect(botonConfirmar().disabled).toBeTrue();
      expect(element.querySelector('.modal__contador')!.textContent).toContain('3/500');
    });

    it('un texto solo de espacios no vale', () => {
      escribir(' '.repeat(40));

      expect(botonConfirmar().disabled).toBeTrue();
    });

    it('el contador muestra el largo del texto recortado', () => {
      escribir('  Las fotos no corresponden  ');

      expect(element.querySelector('.modal__contador')!.textContent).toContain('25/500');
    });

    it('enviar con el formulario inválido no emite y marca el error', () => {
      campo().closest('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();

      expect(confirmados).toEqual([]);
      expect(element.querySelector('#modal-motivo-error')!.textContent).toContain(
        'Escribe el motivo',
      );
    });
  });

  describe('confirmar y cancelar', () => {
    beforeEach(() => abrir());

    it('emite el motivo recortado al confirmar', () => {
      escribir(`   ${VALIDO}   `);

      botonConfirmar().click();

      expect(confirmados).toEqual([VALIDO]);
    });

    it('el botón "Cancelar" emite cancelar', () => {
      botonCancelar().click();

      expect(cancelaciones).toBe(1);
    });

    it('Escape cancela: se emite cancelar y no se cierra solo', () => {
      const evento = new Event('cancel', { cancelable: true });

      dialogo().dispatchEvent(evento);

      expect(cancelaciones).toBe(1);
      expect(evento.defaultPrevented).toBeTrue();
      expect(dialogo().open).toBeTrue();
    });
  });

  describe('mientras se envía', () => {
    beforeEach(() => {
      abrir({ enviando: true });
      escribir(VALIDO);
    });

    it('el botón de confirmar queda deshabilitado con el texto de espera', () => {
      expect(botonConfirmar().disabled).toBeTrue();
      expect(botonConfirmar().getAttribute('aria-busy')).toBe('true');
      expect(botonConfirmar().textContent).toContain('Enviando');
    });

    it('no se puede cancelar ni con el botón ni con Escape', () => {
      expect(botonCancelar().disabled).toBeTrue();

      dialogo().dispatchEvent(new Event('cancel', { cancelable: true }));

      expect(cancelaciones).toBe(0);
    });

    it('no emite si se intenta enviar de nuevo', () => {
      campo().closest('form')!.dispatchEvent(new Event('submit'));

      expect(confirmados).toEqual([]);
    });
  });

  describe('error del servidor', () => {
    it('lo muestra con rol de alerta y marca el campo como inválido', () => {
      abrir({ error: 'El motivo debe tener entre 10 y 500 caracteres' });
      escribir(VALIDO);

      const alerta = element.querySelector('[role="alert"]')!;
      expect(alerta.textContent).toContain('El motivo debe tener entre 10 y 500 caracteres');
      expect(campo().getAttribute('aria-invalid')).toBe('true');
    });

    it('sin error del servidor ni de validación no hay alertas', () => {
      abrir();
      escribir(VALIDO);

      expect(element.querySelector('[role="alert"]')).toBeNull();
      expect(campo().getAttribute('aria-invalid')).toBe('false');
    });
  });
});
