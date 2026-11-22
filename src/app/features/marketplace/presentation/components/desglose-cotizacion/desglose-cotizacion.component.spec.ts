import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Cotizacion } from '../../../domain/models/cotizacion';
import { DesgloseCotizacionComponent } from './desglose-cotizacion.component';

describe('DesgloseCotizacionComponent', () => {
  let fixture: ComponentFixture<DesgloseCotizacionComponent>;
  let element: HTMLElement;

  const base: Cotizacion = {
    idPublicacion: 12,
    fechaLlegada: '2030-06-10',
    fechaSalida: '2030-06-13',
    noches: 3,
    precio: {
      precioNoche: 250000,
      precioBase: 750000,
      porcentajeDescuento: 0,
      valorDescuento: 0,
      tarifaLimpieza: 50000,
      serviciosAdicionales: [],
      totalServiciosAdicionales: 0,
      porcentajeTarifaServicio: 10,
      tarifaServicio: 75000,
      total: 875000,
    },
  };

  const mostrar = (cotizacion: Cotizacion) => {
    fixture.componentRef.setInput('cotizacion', cotizacion);
    fixture.detectChanges();
  };
  const filas = () =>
    Array.from(element.querySelectorAll<HTMLElement>('.fila')).map((fila) =>
      fila.textContent!.replace(/\s+/g, ' ').trim(),
    );

  beforeEach(() => {
    fixture = TestBed.createComponent(DesgloseCotizacionComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('muestra noches × precio por noche = precio base, limpieza, tarifa de servicio y total', () => {
    mostrar(base);

    const texto = filas();
    expect(texto).toHaveSize(4);
    expect(texto[0]).toContain('3 noches × $250,000');
    expect(texto[0]).toContain('$750,000');
    expect(texto[1]).toContain('Tarifa de limpieza');
    expect(texto[1]).toContain('$50,000');
    expect(texto[2]).toContain('Tarifa de servicio (10 %)');
    expect(texto[2]).toContain('$75,000');
    expect(texto[3]).toContain('Total');
    expect(texto[3]).toContain('$875,000 COP');
  });

  it('usa el singular con una sola noche', () => {
    mostrar({ ...base, noches: 1 });

    expect(filas()[0]).toContain('1 noche ×');
  });

  it('oculta la línea de descuento cuando es 0', () => {
    mostrar(base);

    expect(element.querySelector('.fila--descuento')).toBeNull();
    expect(element.textContent).not.toContain('Descuento');
  });

  it('muestra el descuento cuando es mayor que 0, entre el precio base y la limpieza', () => {
    mostrar({
      ...base,
      noches: 7,
      precio: { ...base.precio, porcentajeDescuento: 10, valorDescuento: 175000 },
    });

    const texto = filas();
    expect(texto[1]).toContain('Descuento por estadía larga (10 %)');
    expect(texto[1]).toContain('−$175,000');
    expect(texto[2]).toContain('Tarifa de limpieza');
  });

  it('oculta los servicios adicionales cuando no se eligió ninguno', () => {
    mostrar(base);

    expect(element.textContent).not.toContain('Servicios adicionales');
  });

  it('lista cada servicio con su tipo de cobro y un subtotal, antes de la tarifa de servicio', () => {
    mostrar({
      ...base,
      precio: {
        ...base.precio,
        serviciosAdicionales: [
          { nombre: 'Desayuno', tipoCobro: 'POR_NOCHE', precio: 20000, valor: 60000 },
          { nombre: 'Traslado', tipoCobro: 'POR_ESTANCIA', precio: 80000, valor: 80000 },
        ],
        totalServiciosAdicionales: 140000,
        total: 1015000,
      },
    });

    const texto = filas();
    expect(texto[2]).toContain('Desayuno');
    expect(texto[2]).toContain('$20,000 por noche');
    expect(texto[2]).toContain('$60,000');
    expect(texto[3]).toContain('Traslado');
    expect(texto[3]).toContain('$80,000 por estancia');
    expect(texto[4]).toContain('Servicios adicionales');
    expect(texto[4]).toContain('$140,000');
    expect(texto[5]).toContain('Tarifa de servicio');
    expect(texto[texto.length - 1]).toContain('$1,015,000 COP');
  });

  it('un servicio gratuito se muestra como "Gratis"', () => {
    mostrar({
      ...base,
      precio: {
        ...base.precio,
        serviciosAdicionales: [
          { nombre: 'Café de bienvenida', tipoCobro: 'POR_ESTANCIA', precio: 0, valor: 0 },
        ],
      },
    });

    expect(filas()[2]).toContain('Café de bienvenida');
    expect(filas()[2]).toContain('Gratis');
  });

  it('muestra los valores tal como llegan, sin recalcular el total', () => {
    mostrar({ ...base, precio: { ...base.precio, total: 1 } });

    expect(filas()[filas().length - 1]).toContain('$1 COP');
  });

  it('aclara que la cotización no reserva ni bloquea las fechas', () => {
    mostrar(base);

    expect(element.querySelector('.desglose__nota')!.textContent).toContain(
      'no reserva ni bloquea las fechas',
    );
  });
});
