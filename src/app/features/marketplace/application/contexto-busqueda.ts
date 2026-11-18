import { ParamMap, Params } from '@angular/router';
import { FiltrosBusquedaAlojamientos } from '../domain/models/busqueda-alojamientos';

export interface ContextoBusqueda {
  pagina: number;
  filtros: FiltrosBusquedaAlojamientos;
}

function enteroPositivo(valor: string | null): number | undefined {
  if (!valor || !/^[1-9]\d*$/.test(valor)) {
    return undefined;
  }

  const numero = Number(valor);
  return Number.isSafeInteger(numero) ? numero : undefined;
}

function precio(valor: string | null): number | undefined {
  if (valor === null || !/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(valor)) {
    return undefined;
  }

  return Number(valor);
}

export function leerContextoBusqueda(params: ParamMap): ContextoBusqueda {
  const filtros: FiltrosBusquedaAlojamientos = {};

  const idCiudad = enteroPositivo(params.get('idCiudad'));
  const idTipo = enteroPositivo(params.get('idTipo'));
  const huespedes = enteroPositivo(params.get('huespedes'));
  const precioMinimo = precio(params.get('precioMinimo'));
  const precioMaximo = precio(params.get('precioMaximo'));

  if (idCiudad !== undefined) {
    filtros.idCiudad = idCiudad;
  }

  if (idTipo !== undefined) {
    filtros.idTipo = idTipo;
  }

  if (huespedes !== undefined) {
    filtros.huespedes = huespedes;
  }

  if (precioMinimo !== undefined) {
    filtros.precioMinimo = precioMinimo;
  }

  if (precioMaximo !== undefined) {
    filtros.precioMaximo = precioMaximo;
  }

  const fechaLlegada = params.get('fechaLlegada');
  const fechaSalida = params.get('fechaSalida');

  if (fechaLlegada) {
    filtros.fechaLlegada = fechaLlegada;
  }

  if (fechaSalida) {
    filtros.fechaSalida = fechaSalida;
  }

  const idsServicios = [
    ...new Set(
      params
        .getAll('idsServicios')
        .map(enteroPositivo)
        .filter((id): id is number => id !== undefined),
    ),
  ];

  if (idsServicios.length > 0) {
    filtros.idsServicios = idsServicios;
  }

  const valorPagina = params.get('pagina');
  const pagina =
    valorPagina !== null &&
    /^(0|[1-9]\d*)$/.test(valorPagina) &&
    Number.isSafeInteger(Number(valorPagina))
      ? Number(valorPagina)
      : 0;

  return { pagina, filtros };
}

export function parametrosBusqueda(pagina: number, filtros: FiltrosBusquedaAlojamientos): Params {
  return {
    ...filtros,
    ...(filtros.idsServicios ? { idsServicios: [...filtros.idsServicios] } : {}),
    pagina,
  };
}
