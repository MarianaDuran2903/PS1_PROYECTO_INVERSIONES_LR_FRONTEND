import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  IconoAlojamiento,
  IconoAlojamientoComponent,
  iconoParaTipo,
} from './icono-alojamiento.component';

describe('iconoParaTipo', () => {
  const casos: [string, IconoAlojamiento][] = [
    ['Apartamento', 'apartamento'],
    ['Apartaestudio', 'apartamento'],
    ['Apartahotel', 'apartamento'],
    ['Casa', 'casa'],
    ['Casa de campo', 'casa'],
    ['Cabaña', 'cabana'],
    ['CABAÑA', 'cabana'],
    ['Habitación', 'habitacion'],
    ['Habitacion privada', 'habitacion'],
    ['Finca', 'finca'],
    ['Finca campestre', 'finca'],
    ['Hotel', 'hotel'],
    ['Hostal', 'hostal'],
    ['Glamping', 'glamping'],
    ['Villa', 'villa'],
    ['Algo desconocido', 'generico'],
    ['', 'generico'],
  ];

  for (const [nombre, esperado] of casos) {
    it(`"${nombre}" usa el icono ${esperado}`, () => {
      expect(iconoParaTipo(nombre)).toBe(esperado);
    });
  }
});

describe('IconoAlojamientoComponent', () => {
  let fixture: ComponentFixture<IconoAlojamientoComponent>;

  const crear = (nombre: string) => {
    fixture = TestBed.createComponent(IconoAlojamientoComponent);
    fixture.componentRef.setInput('nombre', nombre);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('svg') as SVGElement;
  };

  it('dibuja un SVG decorativo según el tipo', () => {
    const svg = crear('Cabaña');

    expect(svg.getAttribute('data-icono')).toBe('cabana');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
  });

  it('cada tipo conocido dibuja un trazo distinto', () => {
    const trazos = ['Apartamento', 'Casa', 'Cabaña', 'Habitación', 'Finca'].map(
      (nombre) => crear(nombre).innerHTML,
    );

    expect(new Set(trazos).size).toBe(trazos.length);
  });

  it('usa un icono genérico para un tipo desconocido', () => {
    expect(crear('Nave espacial').getAttribute('data-icono')).toBe('generico');
  });
});
