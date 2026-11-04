import { CatalogoItem, NuevaPublicacion, Publicacion } from '../../domain/models/publicacion';
import {
  CatalogoItemDto,
  CrearPublicacionRequestDto,
  PublicacionResponseDto,
} from '../dtos/publicacion.dto';

/** Adapter entre el modelo de dominio y los DTO del API. */
export const PublicacionMapper = {
  /** Recorta los textos y envía `barrioZona` vacío como null. */
  toRequest(datos: NuevaPublicacion): CrearPublicacionRequestDto {
    const barrioZona = (datos.barrioZona ?? '').trim();
    return {
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      direccionTextual: datos.direccionTextual.trim(),
      idCiudad: datos.idCiudad,
      barrioZona: barrioZona.length > 0 ? barrioZona : null,
      idTipo: datos.idTipo,
      capacidad: datos.capacidad,
      precioNoche: datos.precioNoche,
    };
  },

  toCatalogo(dto: CatalogoItemDto): CatalogoItem {
    return { id: dto.id, nombre: dto.nombre };
  },

  toDomain(dto: PublicacionResponseDto): Publicacion {
    return {
      idPublicacion: dto.idPublicacion,
      idAnfitrion: dto.idAnfitrion,
      estado: dto.estado,
      titulo: dto.titulo,
      descripcion: dto.descripcion,
      direccionTextual: dto.direccionTextual,
      barrioZona: dto.barrioZona,
      ciudad: PublicacionMapper.toCatalogo(dto.ciudad),
      tipo: PublicacionMapper.toCatalogo(dto.tipo),
      politica: PublicacionMapper.toCatalogo(dto.politica),
      capacidad: dto.capacidad,
      precioNoche: dto.precioNoche,
      tarifaLimpieza: dto.tarifaLimpieza,
    };
  },
};
