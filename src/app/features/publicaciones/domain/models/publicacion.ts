/** Elemento de un catálogo (ciudad, tipo de alojamiento, política de cancelación). */
export interface CatalogoItem {
  id: number;
  nombre: string;
}

export type EstadoPublicacion =
  'BORRADOR' | 'PENDIENTE_REVISION' | 'ACTIVA' | 'PAUSADA' | 'BLOQUEADA';

/**
 * Datos que el Anfitrión diligencia para crear una publicación. El anfitrión, el estado y la
 * política los fija el servidor, por eso no forman parte de este modelo.
 */
export interface NuevaPublicacion {
  titulo: string;
  descripcion: string;
  direccionTextual: string;
  idCiudad: number;
  barrioZona?: string;
  idTipo: number;
  capacidad: number;
  precioNoche: number;
}

export type CampoPublicacion = keyof NuevaPublicacion;

/** Errores de validación por campo devueltos por el servidor. */
export type ErroresPublicacion = Partial<Record<CampoPublicacion, string>>;

/** Publicación tal como la devuelve el servidor tras crearla. */
export interface Publicacion {
  idPublicacion: number;
  idAnfitrion: number;
  estado: EstadoPublicacion;
  titulo: string;
  descripcion: string;
  direccionTextual: string;
  barrioZona: string | null;
  ciudad: CatalogoItem;
  tipo: CatalogoItem;
  politica: CatalogoItem;
  capacidad: number;
  precioNoche: number;
  tarifaLimpieza: number;
}
