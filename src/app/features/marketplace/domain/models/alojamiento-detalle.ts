import { CatalogoAlojamiento } from './busqueda-alojamientos';

export interface PoliticaCancelacionAlojamiento {
  id: number;
  nombre: string;
  horasAnticipacionMin: number;
  porcentajeDevolucion: number;
}

export interface ImagenAlojamiento {
  orden: number;
  ruta: string;
}

export interface AlojamientoDetalle {
  idPublicacion: number;
  titulo: string;
  descripcion: string | null;
  estado: 'ACTIVA';
  ciudad: CatalogoAlojamiento;
  barrioZona: string | null;
  tipo: CatalogoAlojamiento;
  capacidad: number;
  precioNoche: number;
  reglas: string | null;
  politica: PoliticaCancelacionAlojamiento;
  servicios: CatalogoAlojamiento[];
  imagenes: ImagenAlojamiento[];
}
