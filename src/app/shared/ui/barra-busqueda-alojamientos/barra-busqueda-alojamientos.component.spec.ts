import { TestBed } from '@angular/core/testing';
import { BarraBusquedaAlojamientosComponent } from './barra-busqueda-alojamientos.component';

describe('BarraBusquedaAlojamientosComponent', () => {
  const configurar = () => {
    const fixture = TestBed.createComponent(BarraBusquedaAlojamientosComponent);
    fixture.detectChanges();
    return fixture;
  };

  const control = (fixture: ReturnType<typeof configurar>, nombre: string) =>
    fixture.componentInstance.formulario.controls[nombre as 'idCiudad'];

  it('muestra los cuatro campos y permite editarlos', () => {
    const fixture = configurar();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.campo').length).toBe(4);
    expect(element.querySelector<HTMLFieldSetElement>('fieldset')?.disabled).toBeFalse();
    expect(element.textContent).toContain('Todos los destinos');
  });

  it('emite solo los filtros completados', () => {
    const fixture = configurar();
    const buscar = jasmine.createSpy('buscar');
    fixture.componentInstance.buscar.subscribe(buscar);

    control(fixture, 'idCiudad').setValue('3');
    control(fixture, 'fechaLlegada').setValue('2030-06-10');
    control(fixture, 'fechaSalida').setValue('2030-06-13');
    control(fixture, 'huespedes').setValue('4');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!
      .click();

    expect(buscar).toHaveBeenCalledWith({
      idCiudad: 3,
      fechaLlegada: '2030-06-10',
      fechaSalida: '2030-06-13',
      huespedes: 4,
    });
  });

  it('rechaza una salida igual o anterior a la llegada', () => {
    const fixture = configurar();
    const buscar = jasmine.createSpy('buscar');
    fixture.componentInstance.buscar.subscribe(buscar);

    control(fixture, 'fechaLlegada').setValue('2030-06-10');
    control(fixture, 'fechaSalida').setValue('2030-06-10');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!
      .click();

    expect(buscar).not.toHaveBeenCalled();
    expect(fixture.componentInstance.formulario.hasError('rangoFechasValido')).toBeTrue();
  });

  it('rechaza indicar solo una de las dos fechas', () => {
    const fixture = configurar();
    const buscar = jasmine.createSpy('buscar');
    fixture.componentInstance.buscar.subscribe(buscar);

    control(fixture, 'fechaLlegada').setValue('2030-06-10');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!
      .click();

    expect(buscar).not.toHaveBeenCalled();
    expect(fixture.componentInstance.formulario.hasError('fechasCompletas')).toBeTrue();
  });

  it('rechaza una cantidad de huéspedes no positiva', () => {
    const fixture = configurar();
    const buscar = jasmine.createSpy('buscar');
    fixture.componentInstance.buscar.subscribe(buscar);

    control(fixture, 'huespedes').setValue('0');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!
      .click();

    expect(buscar).not.toHaveBeenCalled();
    expect(control(fixture, 'huespedes').invalid).toBeTrue();
  });

  it('emite limpiar y restablece el formulario', () => {
    const fixture = configurar();
    const limpiar = jasmine.createSpy('limpiar');
    fixture.componentInstance.limpiar.subscribe(limpiar);

    control(fixture, 'idCiudad').setValue('3');
    fixture.detectChanges();

    const boton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find((item) => item.textContent?.includes('Limpiar'))!;

    boton.click();

    expect(limpiar).toHaveBeenCalledTimes(1);
    expect(control(fixture, 'idCiudad').value).toBe('');
  });

  it('deshabilita buscar mientras se cargan resultados', () => {
    const fixture = TestBed.createComponent(BarraBusquedaAlojamientosComponent);
    fixture.componentRef.setInput('cargando', true);
    fixture.detectChanges();

    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    )!;

    expect(button.disabled).toBeTrue();
  });

  it('deshabilita el destino durante la carga y lo habilita al terminar', () => {
    const fixture = TestBed.createComponent(BarraBusquedaAlojamientosComponent);

    fixture.componentRef.setInput('cargandoCiudades', true);
    fixture.detectChanges();

    expect(fixture.componentInstance.formulario.controls.idCiudad.disabled).toBeTrue();

    fixture.componentRef.setInput('cargandoCiudades', false);
    fixture.detectChanges();

    expect(fixture.componentInstance.formulario.controls.idCiudad.enabled).toBeTrue();
  });
});
