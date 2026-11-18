import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccionAdministrador } from '@features/publicaciones/domain/models/publicacion';
import { ModalMotivoComponent } from '@shared/ui/modal-motivo/modal-motivo.component';
import { BandejaPendientesFacade } from '../../../application/bandeja-pendientes.facade';
import { TarjetaPublicacionAdminComponent } from '../../components/tarjeta-publicacion-admin/tarjeta-publicacion-admin.component';

/**
 * Componente contenedor (smart) de la bandeja del Administrador: las publicaciones pendientes de
 * revisión, de la más antigua a la más reciente, con la información completa para decidir si se
 * aprueban o se rechazan con un motivo. El facade vive y muere con la página.
 */
@Component({
  selector: 'app-bandeja-pendientes-page',
  imports: [RouterLink, TarjetaPublicacionAdminComponent, ModalMotivoComponent],
  providers: [BandejaPendientesFacade],
  templateUrl: './bandeja-pendientes-page.component.html',
  styleUrl: './bandeja-pendientes-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaPendientesPageComponent {
  protected readonly facade = inject(BandejaPendientesFacade);
  /** Esta bandeja solo decide la revisión; bloquear está en la gestión de publicaciones. */
  protected readonly acciones: AccionAdministrador[] = ['aprobar', 'rechazar'];

  protected readonly tituloModal = computed(() => {
    const titulo = this.facade.tituloARechazar();
    return titulo ? `Rechazar «${titulo}»` : 'Rechazar publicación';
  });

  constructor() {
    this.facade.cargar(0);
  }

  /** La acción en curso de una tarjeta; null si la decisión en curso es de otra publicación. */
  protected accionEnCurso(idPublicacion: number): AccionAdministrador | null {
    return this.facade.idEnCurso() === idPublicacion ? this.facade.accionEnCurso() : null;
  }

  protected accionar(idPublicacion: number, accion: AccionAdministrador): void {
    if (accion === 'aprobar') {
      this.facade.aprobar(idPublicacion);
    } else if (accion === 'rechazar') {
      this.facade.iniciarRechazo(idPublicacion);
    }
  }
}
