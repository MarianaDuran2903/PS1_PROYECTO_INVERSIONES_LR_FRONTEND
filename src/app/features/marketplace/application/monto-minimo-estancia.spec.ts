import { MONTO_MINIMO_PAGO_COP } from '@shared/pagos/monto-minimo-pago';
import { Cotizacion, DesglosePrecio } from '../domain/models/cotizacion';
import { estanciaBajoMinimoDePago, nochesMinimasParaPagar } from './monto-minimo-estancia';

describe('monto mínimo de una estancia', () => {
  const cotizacion = (noches: number, precio: Partial<DesglosePrecio>): Cotizacion => ({
    idPublicacion: 9,
    fechaLlegada: '2030-06-10',
    fechaSalida: '2030-06-11',
    noches,
    precio: {
      precioNoche: 0,
      precioBase: 0,
      porcentajeDescuento: 0,
      valorDescuento: 0,
      tarifaLimpieza: 0,
      serviciosAdicionales: [],
      totalServiciosAdicionales: 0,
      porcentajeTarifaServicio: 0,
      tarifaServicio: 0,
      total: 0,
      ...precio,
    },
  });

  it('el mínimo es de 10.000 pesos', () => {
    expect(MONTO_MINIMO_PAGO_COP).toBe(10_000);
  });

  describe('estanciaBajoMinimoDePago', () => {
    it('un total menor al mínimo no se puede pagar', () => {
      expect(estanciaBajoMinimoDePago(cotizacion(1, { total: 9999.99 }))).toBeTrue();
    });

    it('un total igual o mayor al mínimo sí', () => {
      expect(estanciaBajoMinimoDePago(cotizacion(1, { total: 10_000 }))).toBeFalse();
      expect(estanciaBajoMinimoDePago(cotizacion(3, { total: 875_000 }))).toBeFalse();
    });
  });

  describe('nochesMinimasParaPagar', () => {
    it('si el total ya alcanza el mínimo no hace falta nada', () => {
      expect(nochesMinimasParaPagar(cotizacion(1, { precioBase: 20_000, total: 22_000 }))).toBe(
        null,
      );
    });

    it('sin cargos fijos: divide el mínimo entre lo que cuesta cada noche', () => {
      // $ 1.100 por noche + 10 %: 9 noches suman $ 10.890 y 8 solo $ 9.680.
      const resultado = nochesMinimasParaPagar(
        cotizacion(1, { precioNoche: 1100, precioBase: 1100, tarifaServicio: 110, total: 1210 }),
      );

      expect(resultado).toBe(9);
    });

    it('resta la limpieza y los servicios por estancia, que se cobran una sola vez', () => {
      // 2 noches de $ 1.000, limpieza $ 3.000, un servicio por estancia de $ 1.000, sin tarifa:
      // total $ 6.000. Faltan $ 4.000 → 4 noches más: 6 en total suman $ 10.000.
      const resultado = nochesMinimasParaPagar(
        cotizacion(2, {
          precioNoche: 1000,
          precioBase: 2000,
          tarifaLimpieza: 3000,
          serviciosAdicionales: [
            { nombre: 'Toallas', tipoCobro: 'POR_ESTANCIA', precio: 1000, valor: 1000 },
          ],
          totalServiciosAdicionales: 1000,
          total: 6000,
        }),
      );

      expect(resultado).toBe(6);
    });

    it('suma a cada noche los servicios que se cobran por noche', () => {
      // $ 1.500 por noche + $ 500 de desayuno por noche, sin tarifa: 5 noches suman $ 10.000.
      const resultado = nochesMinimasParaPagar(
        cotizacion(1, {
          precioNoche: 1500,
          precioBase: 1500,
          serviciosAdicionales: [
            { nombre: 'Desayuno', tipoCobro: 'POR_NOCHE', precio: 500, valor: 500 },
          ],
          totalServiciosAdicionales: 500,
          total: 2000,
        }),
      );

      expect(resultado).toBe(5);
    });

    it('si casi alcanza, basta con una noche más', () => {
      // La limpieza de $ 9.999 casi llega: con una noche más de $ 0,50 se alcanza el mínimo.
      const resultado = nochesMinimasParaPagar(
        cotizacion(1, { precioNoche: 0.5, precioBase: 0.5, tarifaLimpieza: 9999, total: 9999.5 }),
      );

      expect(resultado).toBe(2);
    });

    it('sin nada que crezca por noche no puede estimar', () => {
      expect(nochesMinimasParaPagar(cotizacion(1, { tarifaLimpieza: 500, total: 500 }))).toBe(null);
    });
  });
});
