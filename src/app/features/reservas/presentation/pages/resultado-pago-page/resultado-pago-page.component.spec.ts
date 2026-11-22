import { Injectable } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RedireccionExterna } from '@core/navigation/redireccion-externa.service';
import { Observable, of, Subject, throwError } from 'rxjs';
import {
  IntentosDePagoAgotadosError,
  PagoNoIniciadoError,
  ReservaNoEncontradaError,
  SinPermisoSobreReservaError,
} from '../../../domain/errors/pago.errors';
import { Pago } from '../../../domain/models/pago';
import { PagoRepository } from '../../../domain/repositories/pago.repository';
import {
  CONSULTAS_MAXIMAS,
  ESPERA_ENTRE_CONSULTAS_MS,
} from '../../../application/resultado-pago.facade';
import { ResultadoPagoPageComponent } from './resultado-pago-page.component';

class RepositorioFalso extends PagoRepository {
  consultas: { idReserva: number }[] = [];
  respuestasConsulta: Observable<Pago>[] = [];
  iniciadas = 0;
  respuestaIniciar: Observable<Pago> = new Subject<Pago>();

  override consultar(idReserva: number): Observable<Pago> {
    const indice = Math.min(this.consultas.length, this.respuestasConsulta.length - 1);
    this.consultas.push({ idReserva });
    return this.respuestasConsulta[indice];
  }

  override iniciar(): Observable<Pago> {
    this.iniciadas++;
    return this.respuestaIniciar;
  }
}

@Injectable()
class RedireccionFalsa extends RedireccionExterna {
  readonly destinos: string[] = [];

  protected override navegar(url: string): void {
    this.destinos.push(url);
  }
}

const pagoDe = (extra: Partial<Pago> = {}): Pago => ({
  idPago: 7,
  idReserva: 31,
  estado: 'PENDIENTE',
  estadoReserva: 'PENDIENTE_PAGO',
  monto: 875000,
  moneda: 'COP',
  urlPago: 'https://checkout.stripe.com/c/pay/cs_test_abc',
  fechaExpiracion: '2030-06-01T10:35:00Z',
  codigoRechazo: null,
  motivoRechazo: null,
  ...extra,
});

describe('ResultadoPagoPageComponent', () => {
  let fixture: ComponentFixture<ResultadoPagoPageComponent>;
  let element: HTMLElement;
  let repositorio: RepositorioFalso;
  let redireccion: RedireccionFalsa;

  const responderCon = (...respuestas: Observable<Pago>[]) => {
    repositorio.respuestasConsulta = respuestas;
  };
  const abrir = (idReserva = '31', cancelado?: string) => {
    fixture.componentRef.setInput('idReserva', idReserva);
    fixture.componentRef.setInput('cancelado', cancelado);
    fixture.detectChanges();
  };
  const boton = (texto: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent!.includes(texto),
    );
  const texto = () => element.textContent!.replace(/\s+/g, ' ');

  beforeEach(() => {
    repositorio = new RepositorioFalso();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PagoRepository, useValue: repositorio },
        { provide: RedireccionExterna, useClass: RedireccionFalsa },
      ],
    });
    redireccion = TestBed.inject(RedireccionExterna) as RedireccionFalsa;
    fixture = TestBed.createComponent(ResultadoPagoPageComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('al cargar consulta el pago de esa reserva y muestra la espera', () => {
    responderCon(new Subject<Pago>());

    abrir('31');

    expect(repositorio.consultas).toEqual([{ idReserva: 31 }]);
    expect(texto()).toContain('Reserva #31');
    expect(element.querySelector('[role="status"]')!.textContent).toContain(
      'Consultando el resultado de tu pago',
    );
  });

  describe('APROBADO', () => {
    beforeEach(() => {
      responderCon(of(pagoDe({ estado: 'APROBADO', estadoReserva: 'CONFIRMADA', urlPago: null })));
      abrir();
    });

    it('confirma la reserva y muestra lo pagado', () => {
      expect(texto()).toContain('¡Pago aprobado!');
      expect(texto()).toContain('Tu reserva quedó confirmada');
      expect(texto()).toContain('$875,000');
      expect(element.querySelector('.alert--success')).not.toBeNull();
    });

    it('no ofrece reintentar el pago', () => {
      expect(boton('Intentar')).toBeUndefined();
      expect(boton('Reintentar')).toBeUndefined();
    });
  });

  describe('RECHAZADO', () => {
    beforeEach(() => {
      responderCon(
        of(
          pagoDe({
            estado: 'RECHAZADO',
            codigoRechazo: 'insufficient_funds',
            motivoRechazo: 'La tarjeta no tiene fondos suficientes',
          }),
        ),
      );
      abrir();
    });

    it('muestra el motivo tal cual y no el código técnico', () => {
      expect(texto()).toContain('El pago fue rechazado');
      expect(texto()).toContain('La tarjeta no tiene fondos suficientes');
      expect(texto()).not.toContain('insufficient_funds');
      expect(texto()).toContain('Tu reserva sigue pendiente de pago');
    });

    it('"Intentar con otra tarjeta" lleva de nuevo a la página de pago', () => {
      boton('Intentar con otra tarjeta')!.click();

      expect(redireccion.destinos).toEqual(['https://checkout.stripe.com/c/pay/cs_test_abc']);
      expect(repositorio.iniciadas).toBe(0);
    });
  });

  it('RECHAZADO sin motivo usa uno por defecto', () => {
    responderCon(of(pagoDe({ estado: 'RECHAZADO', motivoRechazo: null })));

    abrir();

    expect(texto()).toContain('No se pudo procesar el pago con esa tarjeta');
  });

  describe('EXPIRADO', () => {
    beforeEach(() => {
      responderCon(of(pagoDe({ estado: 'EXPIRADO', urlPago: null })));
      abrir();
    });

    it('explica que el tiempo terminó', () => {
      expect(texto()).toContain('El tiempo para pagar terminó');
    });

    it('"Intentar de nuevo" pide otra sesión de pago y redirige a ella', () => {
      const nueva = new Subject<Pago>();
      repositorio.respuestaIniciar = nueva;

      boton('Intentar de nuevo')!.click();
      fixture.detectChanges();

      expect(repositorio.iniciadas).toBe(1);
      expect(boton('Preparando el pago')!.disabled).toBeTrue();

      nueva.next(pagoDe({ urlPago: 'https://checkout.stripe.com/c/pay/cs_test_nueva' }));

      expect(redireccion.destinos).toEqual(['https://checkout.stripe.com/c/pay/cs_test_nueva']);
    });

    it('si se agotaron los intentos, lo explica y lleva a reservar de nuevo', () => {
      const nueva = new Subject<Pago>();
      repositorio.respuestaIniciar = nueva;

      boton('Intentar de nuevo')!.click();
      nueva.error(new IntentosDePagoAgotadosError());
      fixture.detectChanges();

      const alertas = Array.from(element.querySelectorAll('[role="alert"]'));
      expect(alertas.some((a) => a.textContent!.includes('Se agotaron los intentos'))).toBeTrue();
      expect(texto()).toContain('Reservar de nuevo');
    });
  });

  describe('PENDIENTE', () => {
    it('muestra "Procesando tu pago…" y vuelve a consultar solo', fakeAsync(() => {
      responderCon(of(pagoDe()), of(pagoDe({ estado: 'APROBADO', urlPago: null })));

      abrir();

      expect(texto()).toContain('Procesando tu pago');
      expect(repositorio.consultas).toHaveSize(1);

      tick(ESPERA_ENTRE_CONSULTAS_MS);
      fixture.detectChanges();

      expect(repositorio.consultas).toHaveSize(2);
      expect(texto()).toContain('¡Pago aprobado!');
    }));

    it('si tras 10 consultas sigue pendiente, lo dice y permite consultar de nuevo', fakeAsync(() => {
      responderCon(of(pagoDe()));
      abrir();

      tick(ESPERA_ENTRE_CONSULTAS_MS * CONSULTAS_MAXIMAS);
      fixture.detectChanges();

      expect(repositorio.consultas).toHaveSize(CONSULTAS_MAXIMAS);
      expect(texto()).toContain('Aún no recibimos la confirmación');

      responderCon(of(pagoDe({ estado: 'APROBADO', urlPago: null })));
      boton('Consultar de nuevo')!.click();
      fixture.detectChanges();

      expect(texto()).toContain('¡Pago aprobado!');
    }));
  });

  describe('?cancelado=true', () => {
    it('avisa que no se completó el pago y ofrece reintentar con la dirección vigente', () => {
      responderCon(of(pagoDe()));

      abrir('31', 'true');

      expect(texto()).toContain('No se completó el pago');
      expect(texto()).toContain('No se hizo ningún cobro');
      expect(repositorio.consultas).toHaveSize(1);

      boton('Reintentar el pago')!.click();

      expect(redireccion.destinos).toEqual(['https://checkout.stripe.com/c/pay/cs_test_abc']);
    });

    it('no espera ningún resultado: no vuelve a consultar', fakeAsync(() => {
      responderCon(of(pagoDe()));

      abrir('31', 'true');
      tick(ESPERA_ENTRE_CONSULTAS_MS * 5);

      expect(repositorio.consultas).toHaveSize(1);
    }));

    it('si el pago ya estaba aprobado, lo muestra aprobado y no "cancelado"', () => {
      responderCon(of(pagoDe({ estado: 'APROBADO', estadoReserva: 'CONFIRMADA', urlPago: null })));

      abrir('31', 'true');

      expect(texto()).toContain('¡Pago aprobado!');
      expect(texto()).not.toContain('No se completó el pago');
    });

    it('cualquier otro valor de "cancelado" se ignora', () => {
      responderCon(of(pagoDe()), new Subject<Pago>());

      abrir('31', 'si');

      expect(texto()).toContain('Procesando tu pago');
      expect(texto()).not.toContain('No se completó el pago');
      fixture.destroy();
    });
  });

  describe('errores al consultar', () => {
    const conError = (error: unknown) => {
      responderCon(throwError(() => error));
      abrir();
    };

    it('404 sin pago iniciado: ofrece pagar la reserva', () => {
      conError(new PagoNoIniciadoError());

      expect(texto()).toContain('Esta reserva aún no tiene un pago');
      const enlace = element.querySelector<HTMLAnchorElement>('a[href="/reservas/31/pago"]');
      expect(enlace!.textContent).toContain('Pagar mi reserva');
    });

    it('404 reserva inexistente: ofrece volver a explorar', () => {
      conError(new ReservaNoEncontradaError());

      expect(texto()).toContain('No encontramos la reserva');
      expect(texto()).toContain('Explorar alojamientos');
    });

    it('403: mensaje de permisos', () => {
      conError(new SinPermisoSobreReservaError('No tiene permisos sobre esta reserva'));

      expect(texto()).toContain('Sin permisos sobre esta reserva');
    });

    it('un fallo genérico permite reintentar la consulta', () => {
      conError(new Error('Error inesperado'));
      expect(texto()).toContain('Error inesperado');

      responderCon(of(pagoDe({ estado: 'APROBADO', urlPago: null })));
      boton('Reintentar')!.click();
      fixture.detectChanges();

      expect(texto()).toContain('¡Pago aprobado!');
    });

    it('un identificador inválido no consulta', () => {
      responderCon(of(pagoDe()));

      abrir('abc');

      expect(repositorio.consultas).toEqual([]);
      expect(texto()).toContain('No encontramos la reserva');
    });
  });
});
