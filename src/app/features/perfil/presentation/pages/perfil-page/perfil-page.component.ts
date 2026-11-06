import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { PerfilFacade } from '../../../application/perfil.facade';
import { RolPerfil } from '../../../domain/models/perfil';
import { PerfilRepository } from '../../../domain/repositories/perfil.repository';
import { PerfilHttpRepository } from '@features/perfil/domain/repositories/perfil-http.repository';

@Component({
  selector: 'app-perfil-page',
  templateUrl: './perfil-page.component.html',
  styleUrl: './perfil-page.component.scss',
  providers: [PerfilFacade, { provide: PerfilRepository, useClass: PerfilHttpRepository }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilPageComponent implements OnInit {
  protected readonly facade = inject(PerfilFacade);

  protected readonly etiquetasRol: Record<RolPerfil, string> = {
    HUESPED: 'Huésped',
    ANFITRION: 'Anfitrión',
    ADMINISTRADOR: 'Administrador',
  };

  ngOnInit(): void {
    this.facade.cargar();
  }
}
