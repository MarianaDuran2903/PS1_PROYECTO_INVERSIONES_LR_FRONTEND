import { ChangeDetectionStrategy, Component, computed, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccionAdministrador } from '@features/publicaciones/domain/models/publicacion';
import { ModalMotivoComponent } from '@shared/ui/modal-motivo/modal-motivo.component';
import {
  AccionConMotivo,
  DecisionesPublicacionFacade,
} from '../../../application/decisiones-publicacion.facade';
import {
  GestionPublicacionesFacade,
  Pestana,
  PESTANAS,
} from '../../../application/gestion-publicaciones.facade';
import { TarjetaPublicacionAdminComponent } from '../../components/tarjeta-publicacion-admin/tarjeta-publicacion-admin.component';
import { textosDelModal } from '../../textos-modal-motivo';

/**
 * Componente contenedor (smart) de la gestión de publicaciones del Administrador: una pestaña por
 * estado (Pendientes, Activas, Pausadas, Bloqueadas y Todas), con paginación, y las decisiones
 * sobre cada publicación. Los facades viven y mueren con la página.
 */
@Component({
  selector: 'app-gestion-publicaciones-page',
  imports: [RouterLink, TarjetaPublicacionAdminComponent, ModalMotivoComponent],
  providers: [DecisionesPublicacionFacade, GestionPublicacionesFacade],
  templateUrl: './gestion-publicaciones-page.component.html',
  styleUrl: './gestion-publicaciones-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GestionPublicacionesPageComponent {
  protected readonly facade = inject(GestionPublicacionesFacade);
  protected readonly decisiones = inject(DecisionesPublicacionFacade);
  protected readonly pestanas = PESTANAS;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Textos del cuadro del motivo según la acción y la publicación elegidas. */
  protected readonly modal = computed(() => {
    const accion = this.decisiones.accionDelDialogo();
    const publicacion = this.facade.publicacionDe(this.decisiones.idDelDialogo());
    return accion ? textosDelModal(accion, publicacion) : null;
  });

  constructor() {
    this.facade.cargar();
  }

  /** La acción en curso de una tarjeta; null si la decisión en curso es de otra publicación. */
  protected accionEnCurso(idPublicacion: number): AccionAdministrador | null {
    return this.decisiones.idEnCurso() === idPublicacion ? this.decisiones.accionEnCurso() : null;
  }

  protected accionar(idPublicacion: number, accion: AccionAdministrador): void {
    if (accion === 'aprobar') {
      this.decisiones.aprobar(idPublicacion, this.facade.tituloDe(idPublicacion));
    } else {
      this.decisiones.iniciarMotivo(idPublicacion, accion as AccionConMotivo);
    }
  }

  /** Flechas, Inicio y Fin cambian de pestaña, como pide el patrón de pestañas. */
  protected teclaEnPestana(evento: KeyboardEvent, indice: number): void {
    const ultimo = PESTANAS.length - 1;
    const destino: Record<string, number> = {
      ArrowRight: indice === ultimo ? 0 : indice + 1,
      ArrowLeft: indice === 0 ? ultimo : indice - 1,
      Home: 0,
      End: ultimo,
    };
    const siguiente = destino[evento.key];
    if (siguiente === undefined) {
      return;
    }
    evento.preventDefault();
    this.seleccionar(PESTANAS[siguiente].clave);
    this.host.nativeElement
      .querySelector<HTMLElement>(`#pestana-${PESTANAS[siguiente].clave}`)
      ?.focus();
  }

  protected seleccionar(pestana: Pestana): void {
    if (pestana !== this.facade.pestana()) {
      this.facade.seleccionar(pestana);
    }
  }
}
