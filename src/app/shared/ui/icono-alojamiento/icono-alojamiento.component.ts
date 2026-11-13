import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type IconoAlojamiento =
  | 'apartamento'
  | 'casa'
  | 'cabana'
  | 'habitacion'
  | 'finca'
  | 'hotel'
  | 'hostal'
  | 'glamping'
  | 'villa'
  | 'generico';

/**
 * Palabras que identifican cada icono dentro del nombre del tipo. El orden importa: gana la
 * primera coincidencia (p. ej. "Apartahotel" se muestra como apartamento).
 */
const PALABRAS: readonly (readonly [IconoAlojamiento, readonly string[]])[] = [
  ['apartamento', ['apart', 'departamento', 'estudio', 'loft']],
  ['cabana', ['cabana', 'chalet', 'refugio']],
  ['habitacion', ['habitacion', 'cuarto', 'alcoba', 'room', 'suite']],
  ['finca', ['finca', 'hacienda', 'campestre', 'rancho', 'granja']],
  ['hostal', ['hostal', 'hostel', 'albergue']],
  ['hotel', ['hotel', 'posada']],
  ['glamping', ['glamping', 'camping', 'carpa', 'tienda', 'domo']],
  ['villa', ['villa', 'mansion', 'quinta']],
  ['casa', ['casa', 'vivienda', 'hogar']],
];

/** Quita tildes y pasa a minúsculas para comparar ("Cabaña" → "cabana"). */
function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Devuelve el icono que representa el nombre de un tipo de alojamiento. */
export function iconoParaTipo(nombre: string): IconoAlojamiento {
  const texto = normalizar(nombre);
  return (
    PALABRAS.find(([, palabras]) => palabras.some((p) => texto.includes(p)))?.[0] ?? 'generico'
  );
}

/**
 * Icono SVG que representa un tipo de alojamiento según su nombre. Es decorativo: el texto del
 * tipo siempre se muestra al lado, así que se oculta a los lectores de pantalla.
 */
@Component({
  selector: 'app-icono-alojamiento',
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
      [attr.data-icono]="icono()"
    >
      @switch (icono()) {
        @case ('apartamento') {
          <path d="M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18" />
          <path d="M10 7h1M13 7h1M10 11h1M13 11h1M10 15h1M13 15h1M11 21v-3h2v3" />
        }
        @case ('casa') {
          <path d="M3 11.5 12 4l9 7.5M5.5 10v10.5h13V10M10 20.5v-5.5h4v5.5" />
        }
        @case ('cabana') {
          <path d="M12 3 3.5 20.5h17L12 3Z" />
          <path d="M9.5 20.5v-4a2.5 2.5 0 0 1 5 0v4M12 3v3" />
        }
        @case ('habitacion') {
          <path d="M3 19V6M3 15h18M21 19v-6a3 3 0 0 0-3-3h-8v5" />
          <circle cx="6.5" cy="11.5" r="1.7" />
        }
        @case ('finca') {
          <path d="M3 21V10l9-6 9 6v11M3 21h18" />
          <path d="M9 21v-6h6v6M9 15l6 6M15 15l-6 6" />
        }
        @case ('hotel') {
          <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M2 21h20" />
          <path d="M8 8h3M8 12h3M8 16h3" />
        }
        @case ('hostal') {
          <path d="M4 3v18M20 3v18M4 8h16M4 16h16" />
          <path d="M7 8V6h5v2M12 16v-2h5v2" />
        }
        @case ('glamping') {
          <path d="M2.5 20.5 12 4l9.5 16.5h-19ZM12 4v16.5" />
          <path d="M12 20.5l-3.5-6M12 20.5l3.5-6" />
        }
        @case ('villa') {
          <path d="M3 12l9-8 9 8M5.5 10.5v10h13v-10M16 7V4.5h2V9" />
          <path d="M8 20.5v-4h3v4M14 14h3" />
        }
        @default {
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
          <circle cx="12" cy="10" r="2.3" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 1.5em;
      height: 1.5em;
    }

    svg {
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconoAlojamientoComponent {
  /** Nombre del tipo de alojamiento (p. ej. "Cabaña"). */
  readonly nombre = input.required<string>();

  protected readonly icono = computed(() => iconoParaTipo(this.nombre()));
}
