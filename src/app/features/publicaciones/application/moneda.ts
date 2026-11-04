const OPCIONES = { style: 'currency', currency: 'COP' } as const;
const FORMATO_ENTERO = new Intl.NumberFormat('es-CO', {
  ...OPCIONES,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const FORMATO_DECIMAL = new Intl.NumberFormat('es-CO', {
  ...OPCIONES,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Da formato de pesos colombianos para mostrar un valor: "$ 250.000" si es entero y
 * "$ 250.000,50" si tiene decimales. Es solo presentación: el valor numérico que se envía al
 * backend no cambia.
 */
export function formatearPesos(valor: number): string {
  return (Number.isInteger(valor) ? FORMATO_ENTERO : FORMATO_DECIMAL).format(valor);
}
