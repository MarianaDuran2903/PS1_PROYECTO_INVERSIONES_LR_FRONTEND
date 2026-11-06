import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { APP_CONFIG } from '@core/config/app-config';
import { Perfil } from '../../domain/models/perfil';
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
});
