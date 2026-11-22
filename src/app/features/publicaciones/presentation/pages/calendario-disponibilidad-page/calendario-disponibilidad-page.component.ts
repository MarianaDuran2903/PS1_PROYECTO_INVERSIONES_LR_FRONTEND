import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CalendarioDisponibilidadFacade } from '../../../application/calendario-disponibilidad.facade';
import { TipoPeriodoDisponibilidad } from '../../../domain/models/calendario-disponibilidad';

@Component({
  selector: 'app-calendario-disponibilidad-page',
  imports: [RouterLink],
  providers: [CalendarioDisponibilidadFacade],
  templateUrl: './calendario-disponibilidad-page.component.html',
  styleUrl: './calendario-disponibilidad-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioDisponibilidadPageComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly facade = inject(CalendarioDisponibilidadFacade);

  constructor() {
    this.facade.cargar(Number(this.route.snapshot.paramMap.get('id')));
  }

  protected fecha(valor: string): string {
    const fecha = new Date(valor + 'T00:00:00Z');
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(fecha);
  }

  protected etiqueta(tipo: TipoPeriodoDisponibilidad): string {
    switch (tipo) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'NO_OFRECIDO':
        return 'No ofrecido';
      case 'RESERVADO':
        return 'Reservado';
      case 'BLOQUEADO':
        return 'Bloqueado';
    }
  }
}
