import { Observable } from 'rxjs';
import { ActualizarPerfilRequest, Perfil } from '../models/perfil';

export abstract class PerfilRepository {
  abstract consultar(): Observable<Perfil>;

  abstract actualizar(datos: ActualizarPerfilRequest): Observable<Perfil>;
}
