import {
  ActualizarPublicacion,
  CatalogoItem,
  NuevaPublicacion,
  Pagina,
  PaginaPublicaciones,
  Publicacion,
  PublicacionResumen,
} from '../../domain/models/publicacion';
import {
  ActualizarPublicacionRequestDto,
  CatalogoItemDto,
  CrearPublicacionRequestDto,
  PaginaPublicacionesCompletasResponseDto,
  PaginaPublicacionesResponseDto,
  PublicacionResponseDto,
  PublicacionResumenResponseDto,
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

  toResumen(dto: PublicacionResumenResponseDto): PublicacionResumen {
    return {
      idPublicacion: dto.idPublicacion,
      titulo: dto.titulo,
      estado: dto.estado,
      ciudad: PublicacionMapper.toCatalogo(dto.ciudad),
      tipo: PublicacionMapper.toCatalogo(dto.tipo),
      capacidad: dto.capacidad,
      precioNoche: dto.precioNoche,
    };
  },

  /** Convierte la página tal cual llega: no se reordena (el backend ya la entrega ordenada). */
  toPagina(dto: PaginaPublicacionesResponseDto): PaginaPublicaciones {
    return {
      contenido: dto.contenido.map(PublicacionMapper.toResumen),
      pagina: dto.pagina,
      tamano: dto.tamano,
      totalElementos: dto.totalElementos,
      totalPaginas: dto.totalPaginas,
      mensaje: dto.mensaje ?? null,
    };
  },

  /** Página de publicaciones completas (bandeja del Administrador), en el orden en que llega. */
  toPaginaCompleta(dto: PaginaPublicacionesCompletasResponseDto): Pagina<Publicacion> {
    return {
      contenido: dto.contenido.map(PublicacionMapper.toDomain),
      pagina: dto.pagina,
      tamano: dto.tamano,
      totalElementos: dto.totalElementos,
      totalPaginas: dto.totalPaginas,
      mensaje: dto.mensaje ?? null,
    };
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
