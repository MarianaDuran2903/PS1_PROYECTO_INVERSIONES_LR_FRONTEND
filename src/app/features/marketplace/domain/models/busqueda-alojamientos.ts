export interface CatalogoAlojamiento {
  id: number;
  nombre: string;
}

export interface AlojamientoResumen {
  idPublicacion: number;
  titulo: string;
  ciudad: CatalogoAlojamiento;
  tipo: CatalogoAlojamiento;
  capacidad: number;
  precioNoche: number;
  servicios?: CatalogoAlojamiento[];
}

export interface PaginaAlojamientos {
  contenido: AlojamientoResumen[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  mensaje: string | null;
}

export interface FiltrosBusquedaAlojamientos {
  idCiudad?: number;
  fechaLlegada?: string;
  fechaSalida?: string;
  huespedes?: number;
  idTipo?: number;
  precioMinimo?: number;
  precioMaximo?: number;
  idsServicios?: number[];
}
