import {
  CalendarioDisponibilidad,
  PeriodoDisponibilidad,
} from '../../domain/models/calendario-disponibilidad';
import {
  CalendarioDisponibilidadResponseDto,
  PeriodoDisponibilidadDto,
} from '../dtos/calendario-disponibilidad.dto';

export class CalendarioDisponibilidadMapper {
  static toDomain(dto: CalendarioDisponibilidadResponseDto): CalendarioDisponibilidad {
    return {
      idPublicacion: dto.idPublicacion,
      titulo: dto.titulo,
      periodos: dto.periodos.map(CalendarioDisponibilidadMapper.periodoToDomain),
    };
  }

  private static periodoToDomain(dto: PeriodoDisponibilidadDto): PeriodoDisponibilidad {
    return {
      idPeriodo: dto.idPeriodo,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      tipo: dto.tipo,
    };
  }
}
