import { Observable } from 'rxjs';
import { CalendarioDisponibilidad } from '../models/calendario-disponibilidad';

export abstract class CalendarioDisponibilidadRepository {
  abstract consultar(idPublicacion: number): Observable<CalendarioDisponibilidad>;
  abstract abrir(idPublicacion: number, fechaInicio: string, fechaFin: string): Observable<unknown>;
}
