import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Perfil } from '../../../domain/models/perfil';
import { PerfilRepository } from '../../../domain/repositories/perfil.repository';
import { PerfilPageComponent } from './perfil-page.component';

describe('PerfilPageComponent', () => {
  let fixture: ComponentFixture<PerfilPageComponent>;
  let respuesta: Subject<Perfil>;
  let repository: jasmine.SpyObj<PerfilRepository>;

  beforeEach(async () => {
    respuesta = new Subject<Perfil>();
    repository = jasmine.createSpyObj<PerfilRepository>('PerfilRepository', ['consultar']);
    repository.consultar.and.returnValue(respuesta);

    await TestBed.configureTestingModule({
      imports: [PerfilPageComponent],
    })
      .overrideComponent(PerfilPageComponent, {
        add: {
          providers: [{ provide: PerfilRepository, useValue: repository }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PerfilPageComponent);
    fixture.detectChanges();
  });

  it('muestra la carga y después los datos de la cuenta', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="status"]')).not.toBeNull();

    respuesta.next({
      idUsuario: 7,
      primerNombre: 'Ana',
      segundoNombre: null,
      primerApellido: 'Ruiz',
      segundoApellido: 'Perez',
      correo: 'ana@example.com',
      rol: 'ANFITRION',
      cuentaActiva: true,
    });
    fixture.detectChanges();

    expect(element.textContent).toContain('ana@example.com');
    expect(element.textContent).toContain('Anfitrión');
    expect(element.textContent).toContain('No registrado');
    expect(element.textContent).toContain('Perez');
    expect(element.textContent).toContain('Activa');
    expect(element.querySelector('input')).toBeNull();
    expect(element.querySelector('[role="status"]')).toBeNull();
  });

  it('muestra error y permite reintentar', () => {
    respuesta.error(new Error('fallo'));
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[role="alert"]')).not.toBeNull();

    respuesta = new Subject<Perfil>();
    repository.consultar.and.returnValue(respuesta);

    element.querySelector('button')?.click();
    fixture.detectChanges();

    expect(repository.consultar).toHaveBeenCalledTimes(2);
    expect(element.querySelector('[role="status"]')).not.toBeNull();
  });
});
