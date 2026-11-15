import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AccionAdministrador } from '@features/publicaciones/domain/models/publicacion';
import { ModalMotivoComponent } from '@shared/ui/modal-motivo/modal-motivo.component';
import {
  AccionConMotivo,
  DecisionesPublicacionFacade,
} from '../../../application/decisiones-publicacion.facade';
import { DetallePublicacionAdminFacade } from '../../../application/detalle-publicacion-admin.facade';
import { TarjetaPublicacionAdminComponent } from '../../components/tarjeta-publicacion-admin/tarjeta-publicacion-admin.component';
import { textosDelModal } from '../../textos-modal-motivo';

/**
 * Componente contenedor (smart) del detalle de una publicación para el Administrador. El id llega
 * como parámetro de la ruta (`/admin/publicaciones/:id`, enlazado por `withComponentInputBinding`).
 * Muestra la información completa, el motivo del bloqueo si lo tiene y las acciones que su estado
 * permite; después de una decisión, o si el estado real era otro, vuelve a cargar la publicación.
 */
@Component({
  selector: 'app-detalle-publicacion-admin-page',
  imports: [RouterLink, TarjetaPublicacionAdminComponent, ModalMotivoComponent],
  providers: [DetallePublicacionAdminFacade, DecisionesPublicacionFacade],
  templateUrl: './detalle-publicacion-admin-page.component.html',
  styleUrl: './detalle-publicacion-admin-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetallePublicacionAdminPageComponent {
  protected readonly facade = inject(DetallePublicacionAdminFacade);
  protected readonly decisiones = inject(DecisionesPublicacionFacade);

  readonly id = input<string>();

  /** Textos del cuadro del motivo según la acción elegida. */
  protected readonly modal = computed(() => {
    const accion = this.decisiones.accionDelDialogo();
    return accion ? textosDelModal(accion, this.facade.publicacion()) : null;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.facade.cargar(id));
    });

    this.decisiones.resultado$.pipe(takeUntilDestroyed()).subscribe((resultado) => {
      if (resultado === 'hecha' || resultado === 'desactualizada') {
        this.facade.cargar(this.id());
      }
    });
  }

  protected reintentar(): void {
    this.facade.cargar(this.id());
  }

  /** La acción en curso sobre esta publicación; null si no hay ninguna. */
  protected accionEnCurso(idPublicacion: number): AccionAdministrador | null {
    return this.decisiones.idEnCurso() === idPublicacion ? this.decisiones.accionEnCurso() : null;
  }

  protected accionar(idPublicacion: number, titulo: string, accion: AccionAdministrador): void {
    if (accion === 'aprobar') {
      this.decisiones.aprobar(idPublicacion, titulo);
    } else {
      this.decisiones.iniciarMotivo(idPublicacion, accion as AccionConMotivo);
    }
  }
}
