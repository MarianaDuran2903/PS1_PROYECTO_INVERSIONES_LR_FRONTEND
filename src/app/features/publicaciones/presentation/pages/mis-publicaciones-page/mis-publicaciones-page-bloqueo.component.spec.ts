import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import {
  EstadoPublicacion,
  PaginaPublicaciones,
  PublicacionResumen,
} from '../../../domain/models/publicacion';
import { PublicacionRepository } from '../../../domain/repositories/publicacion.repository';
import { MisPublicacionesPageComponent } from './mis-publicaciones-page.component';

/** HU-015 en "Mis publicaciones": el Anfitrión llega al motivo del bloqueo desde el listado. */
describe('MisPublicacionesPageComponent: ver motivo del bloqueo', () => {
  const resumen = (id: number, estado: EstadoPublicacion): PublicacionResumen => ({
    idPublicacion: id,
    titulo: `Publicación ${id}`,
    estado,
    ciudad: { id: 1, nombre: 'Bogotá' },
    tipo: { id: 2, nombre: 'Casa' },
    capacidad: 4,
    precioNoche: 250000,
  });
  const pagina = (contenido: PublicacionResumen[]): PaginaPublicaciones => ({
    contenido,
    pagina: 0,
    tamano: 10,
    totalElementos: contenido.length,
    totalPaginas: 1,
    mensaje: null,
  });

  let fixture: ComponentFixture<MisPublicacionesPageComponent>;
  let element: HTMLElement;

  const filas = () => Array.from(element.querySelectorAll<HTMLElement>('.tarjeta'));
  const verMotivo = (fila: HTMLElement) =>
    Array.from(fila.querySelectorAll<HTMLAnchorElement>('a')).find(
      (a) => a.textContent?.trim() === 'Ver motivo',
    );

  beforeEach(() => {
    const repository = jasmine.createSpyObj<PublicacionRepository>('PublicacionRepository', [
      'listarPropias',
    ]);
    repository.listarPropias.and.returnValue(
      of(
        pagina([
          resumen(5, 'BLOQUEADA'),
          resumen(4, 'ACTIVA'),
          resumen(3, 'PAUSADA'),
          resumen(2, 'PENDIENTE_REVISION'),
          resumen(1, 'BORRADOR'),
        ]),
      ),
    );
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: PublicacionRepository, useValue: repository }],
    });
    fixture = TestBed.createComponent(MisPublicacionesPageComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('solo las filas BLOQUEADA tienen el enlace "Ver motivo"', () => {
    expect(filas().map((fila) => verMotivo(fila) !== undefined)).toEqual([
      true,
      false,
      false,
      false,
      false,
    ]);
  });

  it('"Ver motivo" lleva al detalle de esa publicación, donde está el motivo del bloqueo', () => {
    expect(verMotivo(filas()[0])!.getAttribute('href')).toBe('/anfitrion/publicaciones/5');
  });

  it('una fila bloqueada no ofrece enviar a revisión ni pausar', () => {
    const botones = Array.from(filas()[0].querySelectorAll('button')).map((b) =>
      b.textContent!.trim(),
    );

    expect(botones.filter((t) => t.includes('Pausar') || t.includes('revisión'))).toEqual([]);
  });
});
