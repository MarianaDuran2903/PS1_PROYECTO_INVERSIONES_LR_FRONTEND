import { formatearPesos } from './moneda';

describe('formatearPesos', () => {
  it('usa punto para los miles y el símbolo de pesos', () => {
    const texto = formatearPesos(250000);

    expect(texto).toContain('$');
    expect(texto).toMatch(/250\.000/);
  });

  it('usa coma y siempre dos decimales cuando el valor los tiene', () => {
    expect(formatearPesos(250000.5)).toMatch(/250\.000,50$/);
    expect(formatearPesos(1200)).not.toContain(',');
  });

  it('muestra cero como $ 0', () => {
    expect(formatearPesos(0)).toMatch(/\$\s?0$/);
  });
});
