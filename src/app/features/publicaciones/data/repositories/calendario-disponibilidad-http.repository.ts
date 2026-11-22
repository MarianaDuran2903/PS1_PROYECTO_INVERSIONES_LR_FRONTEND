import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { OMITIR_AVISO_403 } from '@core/http/http-contexts';
import { map, Observable } from 'rxjs';
import { CalendarioDisponibilidad } from '../../domain/models/calendario-disponibilidad';
import { CalendarioDisponibilidadRepository } from '../../domain/repositories/calendario-disponibilidad.repository';
import { CalendarioDisponibilidadResponseDto } from '../dtos/calendario-disponibilidad.dto';
import { CalendarioDisponibilidadMapper } from '../mappers/calendario-disponibilidad.mapper';

@Injectable()
export class CalendarioDisponibilidadHttpRepository extends CalendarioDisponibilidadRepository {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(APP_CONFIG).apiUrl;

  override consultar(idPublicacion: number): Observable<CalendarioDisponibilidad> {
    return this.http
      .get<CalendarioDisponibilidadResponseDto>(
        this.apiUrl + '/publicaciones/' + idPublicacion + '/disponibilidad',
        { context: new HttpContext().set(OMITIR_AVISO_403, true) },
      )
      .pipe(map(CalendarioDisponibilidadMapper.toDomain));
  }

  override abrir(
    idPublicacion: number,
    fechaInicio: string,
    fechaFin: string,
  ): Observable<unknown> {
    return this.http.post(this.apiUrl + '/publicaciones/' + idPublicacion + '/disponibilidad', {
      fechaInicio,
      fechaFin,
    });
  }

  override cerrar(idPublicacion: number, idPeriodo: number): Observable<unknown> {
    return this.http.patch(
      this.apiUrl +
        '/publicaciones/' +
        idPublicacion +
        '/disponibilidad/' +
        idPeriodo +
        '/no-ofrecido',
      null,
    );
  }
}
