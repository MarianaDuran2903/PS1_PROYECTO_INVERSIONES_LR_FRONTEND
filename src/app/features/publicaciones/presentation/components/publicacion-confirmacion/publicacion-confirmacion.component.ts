import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconoAlojamientoComponent } from '@shared/ui/icono-alojamiento/icono-alojamiento.component';
import { formatearPesos } from '../../../application/moneda';
import { Publicacion } from '../../../domain/models/publicacion';
import { AccionActivacionComponent } from '../accion-activacion/accion-activacion.component';
import { BotonEditarPublicacionComponent } from '../boton-editar-publicacion/boton-editar-publicacion.component';
import {
  ETIQUETA_ESTADO,
  EstadoPublicacionComponent,
} from '../estado-publicacion/estado-publicacion.component';

/**
 * Ficha de la publicación recién guardada, con la misma disposición de una ficha de
 * alojamiento: ruta de navegación, zona de fotos, título, dirección, descripción y una
 * tarjeta lateral con el precio y el resumen.
 */
@Component({
  selector: 'app-publicacion-confirmacion',
  imports: [
    IconoAlojamientoComponent,
    EstadoPublicacionComponent,
    BotonEditarPublicacionComponent,
    AccionActivacionComponent,
    RouterLink,
  ],
  templateUrl: './publicacion-confirmacion.component.html',
  styleUrl: './publicacion-confirmacion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicacionConfirmacionComponent {
  readonly publicacion = input.required<Publicacion>();
  /**
   * `confirmacion`: la ficha que aparece justo después de crear (con el aviso de guardado y
   * "Crear otra publicación"). `detalle`: la ficha al abrir una publicación desde el listado.
   */
  readonly modo = input<'confirmacion' | 'detalle'>('confirmacion');
  readonly crearOtra = output<void>();
  /** Solo en el modo `detalle`: el Anfitrión pidió enviar el borrador a revisión. */
  readonly enviarARevision = output<void>();
  /** Esta publicación se está enviando a revisión ahora. */
  readonly enviandoRevision = input(false);

  protected readonly estado = computed(() => ETIQUETA_ESTADO[this.publicacion().estado]);
  protected readonly esDetalle = computed(() => this.modo() === 'detalle');
  protected readonly esBorrador = computed(() => this.publicacion().estado === 'BORRADOR');
  protected readonly precioNoche = computed(() => formatearPesos(this.publicacion().precioNoche));
  protected readonly tarifaLimpieza = computed(() =>
    formatearPesos(this.publicacion().tarifaLimpieza),
  );
  protected readonly textoCapacidad = computed(() => {
    const capacidad = this.publicacion().capacidad;
    return `${capacidad} ${capacidad === 1 ? 'huésped' : 'huéspedes'}`;
  });
  protected readonly ubicacion = computed(() => {
    const { direccionTextual, barrioZona, ciudad } = this.publicacion();
    return [direccionTextual, barrioZona, ciudad.nombre].filter(Boolean).join(', ');
  });
}
