import { TestBed } from '@angular/core/testing';
import { BarraBusquedaAlojamientosComponent } from './barra-busqueda-alojamientos.component';

describe('BarraBusquedaAlojamientosComponent', () => {
  it('muestra los cuatro campos pendientes sin permitir su edición', () => {
    const fixture = TestBed.createComponent(BarraBusquedaAlojamientosComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector<HTMLFieldSetElement>('fieldset')?.disabled).toBeTrue();
    expect(element.querySelectorAll('.campo').length).toBe(4);
    expect(element.textContent).toContain('Todos los destinos');
    expect(element.textContent).toContain('próximamente');
  });

  it('emite la búsqueda sin filtros', () => {
    const fixture = TestBed.createComponent(BarraBusquedaAlojamientosComponent);
    const buscar = jasmine.createSpy('buscar');
    fixture.componentInstance.buscar.subscribe(buscar);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelector('button')!.click();

    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it('deshabilita buscar mientras se cargan resultados', () => {
    const fixture = TestBed.createComponent(BarraBusquedaAlojamientosComponent);
    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.disabled).toBeTrue();
  });
});
