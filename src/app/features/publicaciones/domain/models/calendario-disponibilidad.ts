export type TipoPeriodoDisponibilidad = 'DISPONIBLE' | 'NO_OFRECIDO' | 'RESERVADO' | 'BLOQUEADO';

export interface PeriodoDisponibilidad {
  idPeriodo: number;
  fechaInicio: string;
  fechaFin: string;
  tipo: TipoPeriodoDisponibilidad;
}

/** Calendario propio de una publicación, tal como lo consulta el Anfitrión. */
export interface CalendarioDisponibilidad {
  idPublicacion: number;
  titulo: string;
  periodos: PeriodoDisponibilidad[];
}
