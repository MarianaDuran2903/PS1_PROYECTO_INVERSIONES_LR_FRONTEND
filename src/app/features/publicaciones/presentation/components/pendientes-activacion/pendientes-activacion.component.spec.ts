import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PendientesActivacionComponent } from './pendientes-activacion.component';

describe('PendientesActivacionComponent', () => {
  let fixture: ComponentFixture<PendientesActivacionComponent>;
  let element: HTMLElement;

  const mostrar = (titulo: string | null = null) => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    fixture = TestBed.createComponent(PendientesActivacionComponent);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('idPublicacion', 9);
    fixture.componentRef.setInput('pendientes', [
      {
        campo: 'descripcion',
        mensaje: 'La descripción es obligatoria para solicitar la activación',
      },
      { campo: 'reglas', mensaje: 'Las reglas son obligatorias para solicitar la activación' },
    ]);
    fixture.componentRef.setInput('tituloPublicacion', titulo);
    fixture.detectChanges();
  };

  it('lista el mensaje de cada campo pendiente', () => {
    mostrar();

    const items = Array.from(element.querySelectorAll('li')).map((li) => li.textContent?.trim());
    expect(items).toEqual([
      'La descripción es obligatoria para solicitar la activación',
      'Las reglas son obligatorias para solicitar la activación',
    ]);
  });

  it('enlaza a la edición de la publicación con "Completar publicación"', () => {
    mostrar();

    const enlace = element.querySelector<HTMLAnchorElement>('a')!;
    expect(enlace.textContent?.trim()).toBe('Completar publicación');
    expect(enlace.getAttribute('href')).toBe('/anfitrion/publicaciones/9/editar');
  });

  it('se anuncia como alerta', () => {
    mostrar();

    expect(element.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('sin título habla de "la publicación"; con título lo nombra', () => {
    mostrar();
    expect(element.querySelector('.pendientes__titulo')?.textContent).toContain(
      'Falta información para enviar la publicación a revisión',
    );

    fixture.componentRef.setInput('tituloPublicacion', 'Casa renovada');
    fixture.detectChanges();
    expect(element.querySelector('.pendientes__titulo')?.textContent).toContain(
      'Falta información para enviar «Casa renovada» a revisión',
    );
  });
});
