import { Injectable } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RedireccionExterna } from '@core/navigation/redireccion-externa.service';
import { Observable, Subject } from 'rxjs';
import { PasarelaDePagoNoDisponibleError } from '../../../domain/errors/pago.errors';
import { Pago } from '../../../domain/models/pago';
import { PagoRepository } from '../../../domain/repositories/pago.repository';
import { PagarReservaPageComponent } from './pagar-reserva-page.component';

class RepositorioFalso extends PagoRepository {
  readonly iniciadas: number[] = [];
  readonly respuestas: Subject<Pago>[] = [];

  override iniciar(idReserva: number): Observable<Pago> {
    this.iniciadas.push(idReserva);
    const respuesta = new Subject<Pago>();
    this.respuestas.push(respuesta);
    return respuesta;
  }

  override consultar(): Observable<Pago> {
    throw new Error('No se consulta al iniciar el pago');
  }

  get ultima(): Subject<Pago> {
    return this.respuestas[this.respuestas.length - 1];
  }
}

@Injectable()
class RedireccionFalsa extends RedireccionExterna {
  readonly destinos: string[] = [];

  protected override navegar(url: string): void {
    this.destinos.push(url);
  }
}

describe('PagarReservaPageComponent', () => {
  const pago: Pago = {
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
  };

  let fixture: ComponentFixture<PagarReservaPageComponent>;
  let element: HTMLElement;
  let repositorio: RepositorioFalso;
  let redireccion: RedireccionFalsa;

  const boton = (texto: string) =>
    Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent!.includes(texto),
    );
  const abrir = (idReserva = '31') => {
    fixture.componentRef.setInput('idReserva', idReserva);
    fixture.detectChanges();
  };

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
    fixture = TestBed.createComponent(PagarReservaPageComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('muestra la reserva y aclara que es una prueba sin cobro real ni datos de tarjeta', () => {
    abrir();

    expect(element.querySelector('h1')!.textContent).toContain('Pagar tu reserva');
    expect(element.textContent).toContain('Reserva #31');
    expect(element.textContent).toContain('modo de pruebas');
    expect(element.textContent).toContain('nunca ve los datos de tu tarjeta');
    expect(repositorio.iniciadas).toEqual([]);
  });

  it('lista las tarjetas de prueba', () => {
    abrir();

    const texto = element.querySelector('.pago__pruebas')!.textContent!;
    expect(texto).toContain('4242 4242 4242 4242');
    expect(texto).toContain('4000 0000 0000 0002');
    expect(texto).toContain('4000 0000 0000 9995');
  });

  it('no inicia el pago hasta que la persona lo pide', () => {
    abrir();

    expect(boton('Pagar mi reserva')).toBeDefined();
    expect(repositorio.iniciadas).toEqual([]);
  });

  it('al pagar pide la sesión de pago y espera con el botón deshabilitado', () => {
    abrir();

    boton('Pagar mi reserva')!.click();
    fixture.detectChanges();

    expect(repositorio.iniciadas).toEqual([31]);
    expect(element.textContent).toContain('Preparando el pago');
    expect(boton('Preparando el pago')!.disabled).toBeTrue();
    expect(redireccion.destinos).toEqual([]);
  });

  it('muestra el total a pagar y hasta cuándo, antes de redirigir', () => {
    abrir();
    boton('Pagar mi reserva')!.click();

    repositorio.ultima.next(pago);
    fixture.detectChanges();

    const resumen = element.querySelector('.pago__resumen')!.textContent!;
    expect(resumen).toContain('Total a pagar');
    expect(resumen).toContain('$875,000');
    expect(resumen).toContain('COP');
    expect(resumen).toContain('Tienes hasta el');
    expect(redireccion.destinos).toEqual([]);
  });

  it('al continuar lleva a la página de pago', () => {
    abrir();
    boton('Pagar mi reserva')!.click();
    repositorio.ultima.next(pago);
    fixture.detectChanges();

    boton('Continuar a la página de pago')!.click();

    expect(redireccion.destinos).toEqual(['https://checkout.stripe.com/c/pay/cs_test_abc']);
  });

  it('502: explica que no se pudo iniciar y permite reintentar', () => {
    abrir();
    boton('Pagar mi reserva')!.click();

    repositorio.ultima.error(new PasarelaDePagoNoDisponibleError());
    fixture.detectChanges();

    const alerta = element.querySelector('[role="alert"]')!;
    expect(alerta.textContent).toContain('No pudimos iniciar el pago');
    expect(alerta.textContent).toContain('intenta de nuevo en unos minutos');

    boton('Reintentar')!.click();

    expect(repositorio.iniciadas).toEqual([31, 31]);
  });

  it('un identificador inválido no consulta y dice que la reserva no existe', () => {
    abrir('abc');

    boton('Pagar mi reserva')!.click();
    fixture.detectChanges();

    expect(repositorio.iniciadas).toEqual([]);
    expect(element.querySelector('[role="alert"]')!.textContent).toContain(
      'No encontramos la reserva',
    );
    expect(element.textContent).not.toContain('Reserva #');
  });

  it('al cambiar de reserva descarta lo anterior', () => {
    abrir();
    boton('Pagar mi reserva')!.click();
    repositorio.ultima.next(pago);
    fixture.detectChanges();
    expect(element.querySelector('.pago__resumen')).not.toBeNull();

    abrir('32');

    expect(element.querySelector('.pago__resumen')).toBeNull();
    expect(boton('Pagar mi reserva')).toBeDefined();
  });
});
