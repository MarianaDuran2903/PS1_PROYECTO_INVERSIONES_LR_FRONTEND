import { PublicacionResponseDto } from '../dtos/publicacion.dto';
import { PublicacionMapper } from './publicacion.mapper';

describe('PublicacionMapper.toDomain: motivo del bloqueo (HU-015)', () => {
  const dto = (extra: Partial<PublicacionResponseDto> = {}): PublicacionResponseDto => ({
    idPublicacion: 9,
    idAnfitrion: 3,
    estado: 'BLOQUEADA',
    titulo: 'Casa renovada',
    descripcion: 'Con terraza',
    direccionTextual: 'Carrera 7 # 8-9',
    barrioZona: 'Chapinero',
    ciudad: { id: 4, nombre: 'Cali' },
    tipo: { id: 2, nombre: 'Casa' },
    politica: { id: 1, nombre: 'Flexible' },
    capacidad: 6,
    precioNoche: 300000.5,
    tarifaLimpieza: 0,
    reglas: 'No fumar',
    ...extra,
  });

  it('conserva el motivo del bloqueo cuando llega', () => {
    expect(
      PublicacionMapper.toDomain(dto({ motivoBloqueo: 'Las fotos no corresponden' })).motivoBloqueo,
    ).toBe('Las fotos no corresponden');
  });

  it('un motivo null sigue siendo null', () => {
    expect(PublicacionMapper.toDomain(dto({ motivoBloqueo: null })).motivoBloqueo).toBeNull();
  });

  it('si el backend no manda el campo (versión anterior), queda en null', () => {
    const sinCampo = dto();

    expect('motivoBloqueo' in sinCampo).toBeFalse();
    expect(PublicacionMapper.toDomain(sinCampo).motivoBloqueo).toBeNull();
  });

  it('la página completa también conserva el motivo de cada publicación', () => {
    const pagina = PublicacionMapper.toPaginaCompleta({
      contenido: [
        dto({ motivoBloqueo: 'Datos falsos' }),
        dto({ idPublicacion: 4, estado: 'ACTIVA' }),
      ],
      pagina: 0,
      tamano: 10,
      totalElementos: 2,
      totalPaginas: 1,
      mensaje: null,
    });

    expect(pagina.contenido.map((p) => p.motivoBloqueo)).toEqual(['Datos falsos', null]);
  });
});
