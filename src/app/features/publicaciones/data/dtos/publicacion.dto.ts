/** Cuerpo de POST {apiUrl}/publicaciones. Sin idAnfitrion, estado ni politica: los fija el servidor. */
export interface CrearPublicacionRequestDto {
  titulo: string;
  descripcion: string;
  direccionTextual: string;
  idCiudad: number;
  barrioZona: string | null;
  idTipo: number;
  capacidad: number;
  precioNoche: number;
}

/**
 * Cuerpo de PUT {apiUrl}/publicaciones/{id}. Reemplaza todos los campos editables, así que se
 * envían todos aunque no hayan cambiado. Tampoco lleva idAnfitrion, estado ni politica.
 */
export interface ActualizarPublicacionRequestDto extends CrearPublicacionRequestDto {
  tarifaLimpieza: number;
  reglas: string | null;
}

/** Elemento de GET {apiUrl}/ciudades y GET {apiUrl}/tipos-alojamiento. */
export interface CatalogoItemDto {
  id: number;
  nombre: string;
}

export type EstadoPublicacionDto =
  'BORRADOR' | 'PENDIENTE_REVISION' | 'ACTIVA' | 'PAUSADA' | 'BLOQUEADA';

/** Respuesta de POST (201), GET y PUT de {apiUrl}/publicaciones. */
export interface PublicacionResponseDto {
  idPublicacion: number;
  idAnfitrion: number;
  estado: EstadoPublicacionDto;
  titulo: string;
  descripcion: string;
  direccionTextual: string;
  barrioZona: string | null;
  ciudad: CatalogoItemDto;
  tipo: CatalogoItemDto;
  politica: CatalogoItemDto;
  capacidad: number;
  precioNoche: number;
  tarifaLimpieza: number;
  /** Puede faltar en respuestas de versiones del backend anteriores a la edición. */
  reglas?: string | null;
}
