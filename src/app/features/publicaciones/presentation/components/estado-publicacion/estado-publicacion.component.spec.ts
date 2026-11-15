import { TestBed } from '@angular/core/testing';
import { EstadoPublicacion } from '../../../domain/models/publicacion';
import { EstadoPublicacionComponent } from './estado-publicacion.component';

describe('EstadoPublicacionComponent', () => {
  const casos: [EstadoPublicacion, string, string][] = [
    ['BORRADOR', 'Borrador', 'estado--borrador'],
    ['PENDIENTE_REVISION', 'Pendiente de revisión', 'estado--pendiente_revision'],
    ['ACTIVA', 'Activa', 'estado--activa'],
    ['PAUSADA', 'Pausada', 'estado--pausada'],
    ['BLOQUEADA', 'Bloqueada', 'estado--bloqueada'],
  ];

  for (const [estado, etiqueta, clase] of casos) {
    it(`${estado} muestra "${etiqueta}" con su color`, () => {
      const fixture = TestBed.createComponent(EstadoPublicacionComponent);
      fixture.componentRef.setInput('estado', estado);
      fixture.detectChanges();

      const host = fixture.nativeElement as HTMLElement;
      expect(host.textContent!.trim()).toBe(etiqueta);
      expect(host.classList).toContain(clase);
    });
  }

  it('cada estado tiene una clase distinta', () => {
    const clases = casos.map(([estado]) => {
      const fixture = TestBed.createComponent(EstadoPublicacionComponent);
      fixture.componentRef.setInput('estado', estado);
      fixture.detectChanges();
      return (fixture.nativeElement as HTMLElement).className;
    });

    expect(new Set(clases).size).toBe(casos.length);
  });
});
