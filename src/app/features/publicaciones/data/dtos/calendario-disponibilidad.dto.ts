export interface PeriodoDisponibilidadDto {
  idPeriodo: number;
  fechaInicio: string;
  fechaFin: string;
  tipo: 'DISPONIBLE' | 'NO_OFRECIDO' | 'RESERVADO' | 'BLOQUEADO';
}

export interface CalendarioDisponibilidadResponseDto {
  idPublicacion: number;
  titulo: string;
  periodos: PeriodoDisponibilidadDto[];
}
