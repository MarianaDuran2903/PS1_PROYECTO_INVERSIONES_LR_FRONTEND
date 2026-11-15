import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { BarraBusquedaAlojamientosComponent } from '@shared/ui/barra-busqueda-alojamientos/barra-busqueda-alojamientos.component';

/** Portada pública: presenta la plataforma y dirige a buscar o a publicar. */
@Component({
  selector: 'app-home-page',
  imports: [RouterLink, BarraBusquedaAlojamientosComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePageComponent {
  private readonly router = inject(Router);
  protected readonly paramsAnfitrion = { rol: 'anfitrion' };

  protected readonly categorias = [
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

  protected buscar(): void {
    void this.router.navigate(['/alojamientos']);
  }
}
