import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IconoAlojamientoComponent } from '@shared/ui/icono-alojamiento/icono-alojamiento.component';
import { MisPublicacionesFacade } from '../../../application/mis-publicaciones.facade';
import { formatearPesos } from '../../../application/moneda';
import { PausarPublicacionFacade } from '../../../application/pausar-publicacion.facade';
import { SolicitarActivacionFacade } from '../../../application/solicitar-activacion.facade';
import { AccionActivacionComponent } from '../../components/accion-activacion/accion-activacion.component';
import { AccionPausaComponent } from '../../components/accion-pausa/accion-pausa.component';
import { BotonEditarPublicacionComponent } from '../../components/boton-editar-publicacion/boton-editar-publicacion.component';
import { EstadoPublicacionComponent } from '../../components/estado-publicacion/estado-publicacion.component';
import { PendientesActivacionComponent } from '../../components/pendientes-activacion/pendientes-activacion.component';

/**
 * Componente contenedor (smart) de "Mis publicaciones": lista, de a una página, los alojamientos
 * del Anfitrión autenticado con su estado vigente y permite enviar un borrador a revisión. Los
 * facades viven y mueren con la página.
 */
@Component({
  selector: 'app-mis-publicaciones-page',
  imports: [
    RouterLink,
    IconoAlojamientoComponent,
    EstadoPublicacionComponent,
    BotonEditarPublicacionComponent,
    AccionActivacionComponent,
    AccionPausaComponent,
    PendientesActivacionComponent,
  ],
  providers: [MisPublicacionesFacade, SolicitarActivacionFacade, PausarPublicacionFacade],
  templateUrl: './mis-publicaciones-page.component.html',
  styleUrl: './mis-publicaciones-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MisPublicacionesPageComponent {
  protected readonly facade = inject(MisPublicacionesFacade);
  protected readonly activacion = inject(SolicitarActivacionFacade);
  protected readonly pausa = inject(PausarPublicacionFacade);
  protected readonly pesos = formatearPesos;

  /** Hay una acción en curso (enviar o pausar): los demás botones esperan. */
  protected readonly ocupado = computed(() => this.activacion.enviando() || this.pausa.pausando());

  /** Título de la publicación con campos pendientes, para decir de cuál se trata. */
  protected readonly tituloPendientes = computed(
    () =>
      this.facade
        .publicaciones()
        .find((publicacion) => publicacion.idPublicacion === this.activacion.idPendientes())
        ?.titulo ?? null,
  );

  constructor() {
    this.facade.cargar(0);
    // Tras enviar (o si el estado real era otro) se recarga la página que se está viendo.
    this.activacion.resultado$.pipe(takeUntilDestroyed()).subscribe((resultado) => {
      if (resultado === 'enviada' || resultado === 'rechazada') {
        this.facade.cargar(this.facade.paginaActual());
      }
    });
    // Igual al pausar: se recarga la página que se estaba viendo.
    this.pausa.resultado$.pipe(takeUntilDestroyed()).subscribe((resultado) => {
      if (resultado === 'pausada' || resultado === 'rechazada') {
        this.facade.cargar(this.facade.paginaActual());
      }
    });
  }

  protected textoCapacidad(capacidad: number): string {
    return `${capacidad} ${capacidad === 1 ? 'huésped' : 'huéspedes'}`;
  }
}
