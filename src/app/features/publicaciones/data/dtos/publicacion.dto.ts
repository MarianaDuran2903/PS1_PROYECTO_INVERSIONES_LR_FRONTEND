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

/** Elemento de GET {apiUrl}/ciudades y GET {apiUrl}/tipos-alojamiento. */
export interface CatalogoItemDto {
  id: number;
  nombre: string;
}

export type EstadoPublicacionDto =
  'BORRADOR' | 'PENDIENTE_REVISION' | 'ACTIVA' | 'PAUSADA' | 'BLOQUEADA';

/** Respuesta 201 de POST {apiUrl}/publicaciones. */
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
}
