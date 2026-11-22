import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CalendarioDisponibilidadFacade } from '../../../application/calendario-disponibilidad.facade';
import { TipoPeriodoDisponibilidad } from '../../../domain/models/calendario-disponibilidad';

@Component({
  selector: 'app-calendario-disponibilidad-page',
  imports: [RouterLink, ReactiveFormsModule],
  providers: [CalendarioDisponibilidadFacade],
  templateUrl: './calendario-disponibilidad-page.component.html',
  styleUrl: './calendario-disponibilidad-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarioDisponibilidadPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly facade = inject(CalendarioDisponibilidadFacade);
  protected readonly formulario = this.formBuilder.group({
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
  });

  constructor() {
    this.facade.cargar(Number(this.route.snapshot.paramMap.get('id')));
  }

  protected cerrarPeriodo(idPeriodo: number): void {
    this.facade.cerrarPeriodo(idPeriodo);
  }

  protected abrirPeriodo(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const { fechaInicio, fechaFin } = this.formulario.getRawValue();
    if (!fechaInicio || !fechaFin || fechaFin <= fechaInicio) {
      this.formulario.controls.fechaFin.markAsTouched();
      this.formulario.controls.fechaFin.setErrors({ rangoInvalido: true });
      return;
    }
    this.facade.abrirPeriodo(fechaInicio, fechaFin);
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
