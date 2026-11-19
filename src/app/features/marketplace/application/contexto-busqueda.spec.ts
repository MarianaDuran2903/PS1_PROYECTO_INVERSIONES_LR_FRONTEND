import { convertToParamMap } from '@angular/router';
import { leerContextoBusqueda, parametrosBusqueda } from './contexto-busqueda';

describe('HU-025: contexto de búsqueda', () => {
  it('conserva filtros y página al serializar y restaurar', () => {
    const filtros = {
      idCiudad: 3,
      fechaLlegada: '2030-06-10',
      fechaSalida: '2030-06-13',
      huespedes: 4,
      idTipo: 2,
      precioMinimo: 0,
      precioMaximo: 300000,
      idsServicios: [1, 3],
    };

    const contexto = leerContextoBusqueda(convertToParamMap(parametrosBusqueda(2, filtros)));

    expect(contexto).toEqual({
      pagina: 2,
      filtros,
    });
  });

  it('usa la página inicial sin filtros cuando no hay contexto', () => {
    expect(leerContextoBusqueda(convertToParamMap({}))).toEqual({
      pagina: 0,
      filtros: {},
    });
  });

  it('descarta identificadores inválidos y elimina servicios repetidos', () => {
    const contexto = leerContextoBusqueda(
      convertToParamMap({
        pagina: '-1',
        idCiudad: 'abc',
        idTipo: '0',
        huespedes: '-2',
        precioMinimo: '-1',
        precioMaximo: '10.001',
        idsServicios: ['1', '1', '0', 'abc', '3'],
      }),
    );

    expect(contexto).toEqual({
      pagina: 0,
      filtros: { idsServicios: [1, 3] },
    });
  });
});
