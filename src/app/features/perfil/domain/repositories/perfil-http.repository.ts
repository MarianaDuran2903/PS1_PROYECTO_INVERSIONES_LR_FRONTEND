import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { Perfil } from '../../domain/models/perfil';
import { PerfilRepository } from '@features/perfil/domain/repositories/perfil.repository';

@Injectable()
export class PerfilHttpRepository extends PerfilRepository {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(APP_CONFIG).apiUrl}/usuarios/me`;

  override consultar(): Observable<Perfil> {
    return this.http.get<Perfil>(this.url).pipe(
      map((dto) => ({
        idUsuario: dto.idUsuario,
        primerNombre: dto.primerNombre,
        segundoNombre: dto.segundoNombre,
        primerApellido: dto.primerApellido,
        segundoApellido: dto.segundoApellido,
        correo: dto.correo,
        rol: dto.rol,
        cuentaActiva: dto.cuentaActiva,
      })),
    );
  }
}
