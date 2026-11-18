import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BusquedaAlojamientosFacade } from '@features/marketplace/application/busqueda-alojamientos.facade';
import { BusquedaAlojamientosHttpRepository } from '@features/marketplace/data/repositories/busqueda-alojamientos-http.repository';
import { FiltrosBusquedaAlojamientos } from '@features/marketplace/domain/models/busqueda-alojamientos';
import { BusquedaAlojamientosRepository } from '@features/marketplace/domain/repositories/busqueda-alojamientos.repository';
import { BarraBusquedaAlojamientosComponent } from '@shared/ui/barra-busqueda-alojamientos/barra-busqueda-alojamientos.component';

/** Portada pública: presenta la plataforma y dirige a buscar o a publicar. */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, BarraBusquedaAlojamientosComponent],
  providers: [
    BusquedaAlojamientosFacade,
    { provide: BusquedaAlojamientosRepository, useClass: BusquedaAlojamientosHttpRepository },
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly router = inject(Router);
  protected readonly facade = inject(BusquedaAlojamientosFacade);
  protected readonly paramsAnfitrion = { rol: 'anfitrion' };

  protected readonly categoriasBase = [
    {
      nombre: 'Cabaña',
      titulo: 'Cabañas',
      descripcion: 'Naturaleza y calma',
      imagen: '/img/imgCaba%C3%B1a.jpg',
    },
    {
      nombre: 'Casa',
      titulo: 'Casas',
      descripcion: 'Espacio para compartir',
      imagen: '/img/imgCasas.jpg',
    },
    {
      nombre: 'Apartamento',
      titulo: 'Apartamentos',
      descripcion: 'Todo cerca de ti',
      imagen: '/img/imgApartamentos.png',
    },
    {
      nombre: 'Habitación',
      titulo: 'Habitaciones',
      descripcion: 'Un espacio para descansar',
      imagen: '/img/imgHabitaciones.jpg',
    },
  ];

  protected readonly categorias = computed(() =>
    this.categoriasBase.map((categoria) => ({
      ...categoria,
      idTipo: this.facade.tiposAlojamiento().find((tipo) => tipo.nombre === categoria.nombre)?.id,
    })),
  );

  constructor() {
    this.facade.cargarCiudades();
    this.facade.cargarCaracteristicas();
  }

  protected buscar(filtros: FiltrosBusquedaAlojamientos): void {
    void this.router.navigate(['/alojamientos'], { queryParams: filtros });
  }
}
