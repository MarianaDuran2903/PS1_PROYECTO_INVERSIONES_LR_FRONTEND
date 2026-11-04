import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconoAlojamientoComponent } from '@shared/ui/icono-alojamiento/icono-alojamiento.component';
import { formatearPesos } from '../../../application/moneda';
import { motivoNoEditable, Publicacion, puedeEditar } from '../../../domain/models/publicacion';
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
  imports: [IconoAlojamientoComponent, EstadoPublicacionComponent, RouterLink],
  templateUrl: './publicacion-confirmacion.component.html',
  styleUrl: './publicacion-confirmacion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicacionConfirmacionComponent {
  readonly publicacion = input.required<Publicacion>();
  readonly crearOtra = output<void>();

  protected readonly estado = computed(() => ETIQUETA_ESTADO[this.publicacion().estado]);
  protected readonly esBorrador = computed(() => this.publicacion().estado === 'BORRADOR');
  /** Solo se edita en BORRADOR o PAUSADA; en los demás estados el botón explica por qué no. */
  protected readonly editable = computed(() => puedeEditar(this.publicacion().estado));
  protected readonly motivoNoEditable = computed(() => motivoNoEditable(this.publicacion().estado));
  protected readonly rutaEditar = computed(() => [
    '/anfitrion',
    'publicaciones',
    this.publicacion().idPublicacion,
    'editar',
  ]);
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
