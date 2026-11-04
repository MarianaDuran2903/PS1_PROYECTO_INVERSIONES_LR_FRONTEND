import {
  ActualizarPublicacion,
  CatalogoItem,
  NuevaPublicacion,
  Publicacion,
} from '../../domain/models/publicacion';
import {
  ActualizarPublicacionRequestDto,
  CatalogoItemDto,
  CrearPublicacionRequestDto,
  PublicacionResponseDto,
} from '../dtos/publicacion.dto';

/** Recorta un texto opcional y lo envía como null si queda vacío. */
function textoOpcional(valor: string | undefined): string | null {
  const texto = (valor ?? '').trim();
  return texto.length > 0 ? texto : null;
}

/** Adapter entre el modelo de dominio y los DTO del API. */
export const PublicacionMapper = {
  /** Recorta los textos y envía `barrioZona` vacío como null. */
  toRequest(datos: NuevaPublicacion): CrearPublicacionRequestDto {
    return {
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      direccionTextual: datos.direccionTextual.trim(),
      idCiudad: datos.idCiudad,
      barrioZona: textoOpcional(datos.barrioZona),
      idTipo: datos.idTipo,
      capacidad: datos.capacidad,
      precioNoche: datos.precioNoche,
    };
  },

  /** Igual que `toRequest`, con la tarifa de limpieza y las reglas (vacías como null). */
  toActualizarRequest(datos: ActualizarPublicacion): ActualizarPublicacionRequestDto {
    return {
      ...PublicacionMapper.toRequest(datos),
      tarifaLimpieza: datos.tarifaLimpieza,
      reglas: textoOpcional(datos.reglas),
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
      reglas: dto.reglas ?? null,
    };
  },
};
