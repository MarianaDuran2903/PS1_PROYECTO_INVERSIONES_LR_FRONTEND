import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { CalendarioDisponibilidadFacade } from '../../../application/calendario-disponibilidad.facade';
import { CalendarioDisponibilidad } from '../../../domain/models/calendario-disponibilidad';
import { CalendarioDisponibilidadPageComponent } from './calendario-disponibilidad-page.component';

describe('CalendarioDisponibilidadPageComponent', () => {
  let fixture: ComponentFixture<CalendarioDisponibilidadPageComponent>;
  let facade: jasmine.SpyObj<CalendarioDisponibilidadFacade>;

  beforeEach(() => {
    const calendario = signal<CalendarioDisponibilidad | null>({
      idPublicacion: 12,
      titulo: 'Habitación',
      periodos: [
        { idPeriodo: 1, fechaInicio: '2026-03-01', fechaFin: '2026-03-03', tipo: 'DISPONIBLE' },
        { idPeriodo: 2, fechaInicio: '2026-03-03', fechaFin: '2026-03-04', tipo: 'NO_OFRECIDO' },
        { idPeriodo: 3, fechaInicio: '2026-03-04', fechaFin: '2026-03-05', tipo: 'RESERVADO' },
        { idPeriodo: 4, fechaInicio: '2026-03-05', fechaFin: '2026-03-06', tipo: 'BLOQUEADO' },
      ],
    });

    facade = jasmine.createSpyObj<CalendarioDisponibilidadFacade>(
      'CalendarioDisponibilidadFacade',
      ['cargar', 'reintentar', 'abrirPeriodo'],
      ['estado', 'calendario', 'sinPeriodos', 'guardando', 'errorApertura'],
    );
    Object.defineProperty(facade, 'estado', { value: signal('listo') });
    Object.defineProperty(facade, 'calendario', { value: calendario });
    Object.defineProperty(facade, 'sinPeriodos', { value: signal(false) });
    Object.defineProperty(facade, 'guardando', { value: signal(false) });
    Object.defineProperty(facade, 'errorApertura', { value: signal(null) });

    TestBed.configureTestingModule({
      imports: [CalendarioDisponibilidadPageComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '12' } } },
        },
      ],
    });
    TestBed.overrideComponent(CalendarioDisponibilidadPageComponent, { set: { providers: [] } });
    TestBed.overrideProvider(CalendarioDisponibilidadFacade, { useValue: facade });
    fixture = TestBed.createComponent(CalendarioDisponibilidadPageComponent);
    fixture.detectChanges();
  });

  it('solicita el calendario de la ruta y muestra todos los tipos de periodo', () => {
    const contenido = fixture.nativeElement.textContent as string;

    expect(facade.cargar).toHaveBeenCalledOnceWith(12);
    expect(contenido).toContain('Habitación');
    expect(contenido).toContain('Disponible');
    expect(contenido).toContain('No ofrecido');
    expect(contenido).toContain('Reservado');
    expect(contenido).toContain('Bloqueado');
  });

  it('envía el rango válido al abrir disponibilidad', () => {
    const inicio = fixture.nativeElement.querySelector(
      '[formControlName="fechaInicio"]',
    ) as HTMLInputElement;
    const fin = fixture.nativeElement.querySelector(
      '[formControlName="fechaFin"]',
    ) as HTMLInputElement;
    inicio.value = '2026-06-10';
    inicio.dispatchEvent(new Event('input'));
    fin.value = '2026-06-13';
    fin.dispatchEvent(new Event('input'));

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(facade.abrirPeriodo).toHaveBeenCalledOnceWith('2026-06-10', '2026-06-13');
  });

  it('rechaza fechas iguales y muestra el error del rango', () => {
    const inicio = fixture.nativeElement.querySelector(
      '[formControlName="fechaInicio"]',
    ) as HTMLInputElement;
    const fin = fixture.nativeElement.querySelector(
      '[formControlName="fechaFin"]',
    ) as HTMLInputElement;
    inicio.value = '2026-06-10';
    inicio.dispatchEvent(new Event('input'));
    fin.value = '2026-06-10';
    fin.dispatchEvent(new Event('input'));

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(facade.abrirPeriodo).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      'La fecha de fin debe ser posterior a la fecha de inicio.',
    );
  });

  it('marca los campos requeridos si se envía el formulario vacío', () => {
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(facade.abrirPeriodo).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('[formControlName="fechaInicio"]').required,
    ).toBeTrue();
  });
});
