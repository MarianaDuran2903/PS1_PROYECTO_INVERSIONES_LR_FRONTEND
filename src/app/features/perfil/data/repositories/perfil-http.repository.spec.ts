import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { ActualizarPerfilRequest, Perfil } from '../../domain/models/perfil';
import { PerfilHttpRepository } from '@features/perfil/domain/repositories/perfil-http.repository';

describe('PerfilHttpRepository', () => {
  let repository: PerfilHttpRepository;
  let http: HttpTestingController;

  const perfil: Perfil = {
    idUsuario: 7,
    primerNombre: 'Ana',
    segundoNombre: null,
    primerApellido: 'Ruiz',
    segundoApellido: null,
    correo: 'ana@example.com',
    rol: 'HUESPED',
    cuentaActiva: true,
  };

  const cambios: ActualizarPerfilRequest = {
    primerNombre: 'Carlos',
    segundoNombre: null,
    primerApellido: 'Gómez',
    segundoApellido: 'Pérez',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { apiUrl: '/api-test' } },
        PerfilHttpRepository,
      ],
    });

    repository = TestBed.inject(PerfilHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta el perfil propio sin enviar identificadores', () => {
    let resultado: Perfil | undefined;
    repository.consultar().subscribe((valor) => (resultado = valor));

    const request = http.expectOne('/api-test/usuarios/me');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);

    request.flush({ ...perfil, contrasenaHash: 'no-debe-mapearse' });

    expect(resultado).toEqual(perfil);
  });

  it('propaga errores para que los gestione la aplicación', () => {
    let estado = 0;
    repository.consultar().subscribe({
      error: (error: { status: number }) => (estado = error.status),
    });

    http.expectOne('/api-test/usuarios/me').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(estado).toBe(401);
  });

  it('actualiza el perfil propio con PUT y solo los campos editables', () => {
    const perfilActualizado: Perfil = { ...perfil, ...cambios };

    let resultado: Perfil | undefined;

    repository.actualizar(cambios).subscribe((valor) => {
      resultado = valor;
    });

    const request = http.expectOne('/api-test/usuarios/me');

    expect(request.request.method).toBe('PUT');
    expect(request.request.params.keys()).toEqual([]);
    expect(request.request.body).toEqual(cambios);
    expect(Object.keys(request.request.body).sort()).toEqual(
      ['primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido'].sort(),
    );

    request.flush({
      ...perfilActualizado,
      contrasenaHash: 'no-debe-mapearse',
    });

    expect(resultado).toEqual(perfilActualizado);
  });

  it('permite enviar los nombres opcionales como null', () => {
    const cambiosSinOpcionales: ActualizarPerfilRequest = {
      ...cambios,
      segundoNombre: null,
      segundoApellido: null,
    };

    let resultado: Perfil | undefined;

    repository.actualizar(cambiosSinOpcionales).subscribe((valor) => {
      resultado = valor;
    });

    const request = http.expectOne('/api-test/usuarios/me');

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(cambiosSinOpcionales);

    request.flush({
      ...perfil,
      ...cambiosSinOpcionales,
    });

    expect(resultado?.segundoNombre).toBeNull();
    expect(resultado?.segundoApellido).toBeNull();
  });

  it('propaga los errores de validación al actualizar', () => {
    let estado = 0;

    repository.actualizar(cambios).subscribe({
      error: (error: { status: number }) => {
        estado = error.status;
      },
    });

    const request = http.expectOne('/api-test/usuarios/me');

    expect(request.request.method).toBe('PUT');

    request.flush(
      { mensaje: 'Los datos enviados no son válidos' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(estado).toBe(400);
  });
});
