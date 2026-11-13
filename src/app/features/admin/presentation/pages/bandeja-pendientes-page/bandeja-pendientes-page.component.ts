import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatearPesos } from '@features/publicaciones/application/moneda';
import { accionesAdministrador } from '@features/publicaciones/domain/models/publicacion';
import { EstadoPublicacionComponent } from '@features/publicaciones/presentation/components/estado-publicacion/estado-publicacion.component';
import { ModalMotivoComponent } from '@shared/ui/modal-motivo/modal-motivo.component';
import { BandejaPendientesFacade } from '../../../application/bandeja-pendientes.facade';

/**
 * Componente contenedor (smart) de la bandeja del Administrador: las publicaciones pendientes de
 * revisión, de la más antigua a la más reciente, con la información completa para decidir si se
 * aprueban o se rechazan con un motivo. El facade vive y muere con la página.
 */
@Component({
  selector: 'app-bandeja-pendientes-page',
  imports: [RouterLink, EstadoPublicacionComponent, ModalMotivoComponent],
  providers: [BandejaPendientesFacade],
  templateUrl: './bandeja-pendientes-page.component.html',
  styleUrl: './bandeja-pendientes-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaPendientesPageComponent {
  protected readonly facade = inject(BandejaPendientesFacade);
  protected readonly pesos = formatearPesos;
  protected readonly acciones = accionesAdministrador;

  protected readonly tituloModal = computed(() => {
    const titulo = this.facade.tituloARechazar();
    return titulo ? `Rechazar «${titulo}»` : 'Rechazar publicación';
  });

  constructor() {
    this.facade.cargar(0);
  }

  protected textoCapacidad(capacidad: number): string {
    return `${capacidad} ${capacidad === 1 ? 'huésped' : 'huéspedes'}`;
  }
}
