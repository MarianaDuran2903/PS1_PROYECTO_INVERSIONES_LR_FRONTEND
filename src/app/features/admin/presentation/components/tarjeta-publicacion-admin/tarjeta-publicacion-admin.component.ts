import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatearPesos } from '@features/publicaciones/application/moneda';
import {
  AccionAdministrador,
  accionesAdministrador,
  Publicacion,
} from '@features/publicaciones/domain/models/publicacion';
import { EstadoPublicacionComponent } from '@features/publicaciones/presentation/components/estado-publicacion/estado-publicacion.component';
import { AvisoInformacionMinima } from '../../../application/decisiones-publicacion.facade';

/** Texto del botón de cada acción y el que muestra mientras se ejecuta. */
const BOTONES: Record<AccionAdministrador, { texto: string; enCurso: string; variante: string }> = {
  aprobar: { texto: 'Aprobar', enCurso: 'Aprobando…', variante: 'btn--primary' },
  rechazar: { texto: 'Rechazar', enCurso: 'Rechazando…', variante: 'btn--outline' },
  bloquear: { texto: 'Bloquear', enCurso: 'Bloqueando…', variante: 'btn--outline' },
  reactivar: { texto: 'Reactivar', enCurso: 'Reactivando…', variante: 'btn--primary' },
};

/**
 * Tarjeta de una publicación para el Administrador (el host es la propia tarjeta, con la clase
 * `tarjeta`; en las listas va dentro de un `<li>`): título (enlace a su detalle), «Anfitrión #id»,
 * ciudad, tipo, precio, estado y, si está bloqueada, el motivo del bloqueo destacado. En modo
 * `completa` agrega toda la información para decidir (dirección, descripción, reglas, política,
 * capacidad y tarifas). Los botones salen de `accionesAdministrador(estado)`, salvo que quien la
 * usa pase `acciones`. Solo emite `accionar`: confirmar y llamar al servidor es cosa de la página.
 */
@Component({
  selector: 'app-tarjeta-publicacion-admin',
  imports: [RouterLink, EstadoPublicacionComponent],
  host: { class: 'tarjeta' },
  templateUrl: './tarjeta-publicacion-admin.component.html',
  styleUrl: './tarjeta-publicacion-admin.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarjetaPublicacionAdminComponent {
  readonly publicacion = input.required<Publicacion>();
  /** El título es un enlace al detalle de la publicación; en el propio detalle se apaga. */
  readonly conEnlace = input(true);
  /** Muestra toda la información de la publicación y no solo el resumen. */
  readonly completa = input(false);
  /** Acciones a mostrar; por defecto, las del estado de la publicación. */
  readonly acciones = input<AccionAdministrador[] | null>(null);
  /** Qué falta para activarla, si el backend rechazó aprobarla o reactivarla. */
  readonly aviso = input<AvisoInformacionMinima | undefined>(undefined);
  /** Acción que se está ejecutando sobre ESTA publicación. */
  readonly accionEnCurso = input<AccionAdministrador | null>(null);
  /** Hay una decisión en curso (en esta u otra publicación): los botones esperan. */
  readonly ocupado = input(false);
  readonly accionar = output<AccionAdministrador>();

  protected readonly pesos = formatearPesos;
  protected readonly botones = computed(() =>
    (this.acciones() ?? accionesAdministrador(this.publicacion().estado)).map((accion) => ({
      accion,
      ...BOTONES[accion],
    })),
  );
  protected readonly textoCapacidad = computed(() => {
    const capacidad = this.publicacion().capacidad;
    return `${capacidad} ${capacidad === 1 ? 'huésped' : 'huéspedes'}`;
  });
  protected readonly rutaDetalle = computed(() => [
    '/admin',
    'publicaciones',
    this.publicacion().idPublicacion,
  ]);
  protected readonly rutaIntervenir = computed(() => [
    '/admin',
    'publicaciones',
    this.publicacion().idPublicacion,
    'editar',
  ]);
}
