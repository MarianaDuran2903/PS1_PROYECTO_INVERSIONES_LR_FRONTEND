import { Observable } from 'rxjs';
import { Perfil } from '../models/perfil';

export abstract class PerfilRepository {
  abstract consultar(): Observable<Perfil>;
}
