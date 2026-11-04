import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Publicacion } from '../../../domain/models/publicacion';
import { PublicacionConfirmacionComponent } from './publicacion-confirmacion.component';

describe('PublicacionConfirmacionComponent', () => {
  const publicacion: Publicacion = {
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'BORRADOR',
    titulo: 'Apartamento luminoso',
    descripcion: 'Cerca del parque',
    direccionTextual: 'Calle 10 # 5-20',
    barrioZona: 'Chapinero',
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Apartamento' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 4,
    precioNoche: 250000,
    tarifaLimpieza: 0,
  };

  let fixture: ComponentFixture<PublicacionConfirmacionComponent>;
  let element: HTMLElement;

  const crear = (datos: Publicacion = publicacion) => {
    fixture = TestBed.createComponent(PublicacionConfirmacionComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('publicacion', datos);
    fixture.detectChanges();
  };

  it('avisa que se guardó como borrador y que todavía no es visible en el Marketplace', () => {
    crear();

    const aviso = element.querySelector('.ficha__aviso')!.textContent!;
    expect(aviso).toContain('Publicación guardada como borrador');
    expect(aviso).toContain('Todavía no es visible en el Marketplace');
  });

  it('muestra el estado BORRADOR', () => {
    crear();

    expect(element.querySelector('.ficha__estado')!.textContent!.trim()).toBe('Borrador');
  });

  it('muestra la ruta, el título, la dirección y la descripción', () => {
    crear();

    const ruta = Array.from(element.querySelectorAll('.ficha__ruta li'), (li) =>
      li.textContent?.trim(),
    );
    expect(ruta).toEqual(['Alojamientos', 'Bogotá', 'Apartamento', 'Apartamento luminoso']);
    expect(element.querySelector('h1')!.textContent).toContain('Apartamento luminoso');
    expect(element.querySelector('.ficha__direccion')!.textContent).toContain(
      'Calle 10 # 5-20, Chapinero, Bogotá',
    );
    expect(element.querySelector('.ficha__descripcion')!.textContent).toContain('Cerca del parque');
  });

  it('muestra el precio en pesos colombianos, la tarifa de limpieza y la política', () => {
    crear();

    const resumen = element.querySelector('.ficha__resumen')!.textContent!;
    expect(resumen).toMatch(/250\.000/);
    expect(resumen).toContain('por noche');
    expect(resumen).toContain('Tarifa de limpieza');
    expect(resumen).toContain('Flexible');
    expect(resumen).toContain('4 huéspedes');
  });

  it('omite el barrio cuando no hay y usa singular con un huésped', () => {
    crear({ ...publicacion, barrioZona: null, capacidad: 1 });

    expect(element.querySelector('.ficha__direccion')!.textContent).toContain(
      'Calle 10 # 5-20, Bogotá',
    );
    expect(element.textContent).not.toContain('Barrio o zona');
    expect(element.querySelector('.ficha__resumen')!.textContent).toContain('1 huésped');
  });

  it('deja claro que todavía no tiene fotos', () => {
    crear();

    expect(element.querySelector('.ficha__galeria')!.textContent).toContain('Sin fotos todavía');
  });

  it('la zona de fotos muestra el icono del tipo de alojamiento', () => {
    crear({ ...publicacion, tipo: { id: 3, nombre: 'Cabaña' } });

    expect(element.querySelector('.ficha__galeria svg')!.getAttribute('data-icono')).toBe('cabana');
  });

  it('emite crearOtra al pulsar el botón', () => {
    crear();
    let veces = 0;
    fixture.componentInstance.crearOtra.subscribe(() => veces++);

    element.querySelector<HTMLButtonElement>('.ficha__resumen button')!.click();

    expect(veces).toBe(1);
  });

  it('no dice que es un borrador si el estado es otro', () => {
    crear({ ...publicacion, estado: 'ACTIVA' });

    expect(element.querySelector('.ficha__estado')!.textContent!.trim()).toBe('Activa');
    expect(element.querySelector('.ficha__nota')).toBeNull();
  });
});
