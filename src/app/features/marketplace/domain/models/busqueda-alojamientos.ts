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
}

export interface PaginaAlojamientos {
  contenido: AlojamientoResumen[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  mensaje: string | null;
}
