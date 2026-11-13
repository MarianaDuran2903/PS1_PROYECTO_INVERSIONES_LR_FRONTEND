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

/** Datos para editar: reemplazan todos los campos editables, incluidos los dos de la edición. */
export interface ActualizarPublicacion extends NuevaPublicacion {
  tarifaLimpieza: number;
  reglas?: string;
}

export type CampoPublicacion = keyof ActualizarPublicacion;

/** Errores de validación por campo devueltos por el servidor. */
export type ErroresPublicacion = Partial<Record<CampoPublicacion, string>>;

/** Publicación tal como la devuelve el servidor. */
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
  reglas: string | null;
}

/** Solo una publicación en borrador o pausada se puede editar. */
const ESTADOS_EDITABLES: readonly EstadoPublicacion[] = ['BORRADOR', 'PAUSADA'];

const MOTIVO_NO_EDITABLE: Partial<Record<EstadoPublicacion, string>> = {
  ACTIVA: 'Esta publicación está activa. Para editarla, solicita al Administrador que la pause.',
  PENDIENTE_REVISION: 'La publicación está en revisión del Administrador.',
  BLOQUEADA: 'La publicación está bloqueada.',
};

export function puedeEditar(estado: EstadoPublicacion): boolean {
  return ESTADOS_EDITABLES.includes(estado);
}

/** Solo un borrador se envía a revisión: es el único estado desde el que se solicita la activación. */
export function puedeEnviarARevision(estado: EstadoPublicacion): boolean {
  return estado === 'BORRADOR';
}

/** Campos que el backend exige para solicitar la activación (la creación no pide todos). */
export type CampoPendienteActivacion = 'descripcion' | 'direccionTextual' | 'barrioZona' | 'reglas';

/** Información que falta para solicitar la activación, con el mensaje del backend por campo. */
export type PendientesActivacion = Partial<Record<CampoPendienteActivacion, string>>;

/** Por qué no se puede editar en ese estado; null si sí se puede. */
export function motivoNoEditable(estado: EstadoPublicacion): string | null {
  return MOTIVO_NO_EDITABLE[estado] ?? null;
}

/** Intervención administrativa: los nuevos datos de la publicación más el motivo que la autoriza. */
export interface IntervencionPublicacion {
  motivo: string;
  cambios: ActualizarPublicacion;
}

export type CampoIntervencion = CampoPublicacion | 'motivo';

/** Errores por campo de una intervención; además de los de la publicación, el del motivo. */
export type ErroresIntervencion = Partial<Record<CampoIntervencion, string>>;

/** Publicación tal como aparece en un listado: solo lo necesario para mostrarla en una tarjeta. */
export interface PublicacionResumen {
  idPublicacion: number;
  titulo: string;
  estado: EstadoPublicacion;
  ciudad: CatalogoItem;
  tipo: CatalogoItem;
  capacidad: number;
  precioNoche: number;
}

/** Una página de publicaciones. `pagina` empieza en 0. */
export interface PaginaPublicaciones {
  contenido: PublicacionResumen[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
  /** Aviso del backend cuando no hay ninguna publicación; null en otro caso. */
  mensaje: string | null;
}
