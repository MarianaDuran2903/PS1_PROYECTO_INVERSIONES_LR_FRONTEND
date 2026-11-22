import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ErrorPago, TipoErrorPago } from '../../../application/errores-pago';
import { ErrorPagoComponent } from './error-pago.component';

describe('ErrorPagoComponent', () => {
  let fixture: ComponentFixture<ErrorPagoComponent>;
  let element: HTMLElement;
  let reintentos: number;

  const mostrar = (tipo: TipoErrorPago, extra: Record<string, unknown> = {}) => {
    const error: ErrorPago = { tipo, mensaje: `Mensaje de ${tipo}` };
    fixture.componentRef.setInput('error', error);
    for (const [clave, valor] of Object.entries(extra)) {
      fixture.componentRef.setInput(clave, valor);
    }
    fixture.detectChanges();
  };
  const botones = () =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).map((b) =>
      b.textContent!.trim(),
    );
  const enlaces = () =>
    Array.from(element.querySelectorAll<HTMLAnchorElement>('a')).map((a) => ({
      texto: a.textContent!.trim(),
      ruta: new URL(a.href).pathname,
    }));

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ErrorPagoComponent);
    element = fixture.nativeElement as HTMLElement;
    reintentos = 0;
    fixture.componentInstance.reintentar.subscribe(() => reintentos++);
  });

  it('muestra el mensaje y un título según el tipo', () => {
    mostrar('no-admite-pago');

    expect(element.querySelector('h2')!.textContent).toContain('La reserva venció');
    expect(element.textContent).toContain('Mensaje de no-admite-pago');
  });

  for (const tipo of ['pasarela', 'otro'] as const) {
    describe(`${tipo}`, () => {
      it('ofrece reintentar y lo emite al pulsar', () => {
        mostrar(tipo);

        expect(botones()).toEqual(['Reintentar']);
        element.querySelector('button')!.click();

        expect(reintentos).toBe(1);
      });

      it('con un reintento en curso deshabilita el botón', () => {
        mostrar(tipo, { reintentando: true });

        const boton = element.querySelector<HTMLButtonElement>('button')!;
        expect(boton.disabled).toBeTrue();
        expect(boton.textContent).toContain('Preparando el pago');
      });
    });
  }

  for (const tipo of ['no-admite-pago', 'intentos-agotados'] as const) {
    it(`${tipo}: lleva a reservar de nuevo y no ofrece reintentar`, () => {
      mostrar(tipo);

      expect(botones()).toEqual([]);
      expect(enlaces()).toEqual([{ texto: 'Reservar de nuevo', ruta: '/alojamientos' }]);
    });
  }

  it('sin pago iniciado: ofrece pagar esa reserva', () => {
    mostrar('sin-pago', { idReserva: 31 });

    expect(enlaces()[0]).toEqual({ texto: 'Pagar mi reserva', ruta: '/reservas/31/pago' });
  });

  it('sin pago iniciado y sin reserva conocida: no ofrece pagar', () => {
    mostrar('sin-pago', { idReserva: null });

    expect(enlaces().map((e) => e.texto)).toEqual(['Explorar alojamientos']);
  });

  for (const tipo of ['no-encontrada', 'sin-permiso'] as const) {
    it(`${tipo}: ofrece explorar alojamientos, no hay lista de reservas`, () => {
      mostrar(tipo);

      expect(enlaces()).toEqual([{ texto: 'Explorar alojamientos', ruta: '/alojamientos' }]);
      expect(botones()).toEqual([]);
    });
  }

  it('ya pagada no es una alerta: se anuncia como estado de éxito', () => {
    mostrar('ya-pagada');

    const caja = element.querySelector('.error-pago')!;
    expect(caja.getAttribute('role')).toBe('status');
    expect(caja.classList.contains('alert--success')).toBeTrue();
    expect(element.querySelector('h2')!.textContent).toContain('ya está confirmada');
  });

  it('los demás errores se anuncian como alerta', () => {
    mostrar('intentos-agotados');

    const caja = element.querySelector('.error-pago')!;
    expect(caja.getAttribute('role')).toBe('alert');
    expect(caja.classList.contains('alert--danger')).toBeTrue();
  });
});
