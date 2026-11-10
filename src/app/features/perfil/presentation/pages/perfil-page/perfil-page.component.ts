import { ChangeDetectionStrategy, Component, effect, inject, OnInit } from '@angular/core';
import { PerfilFacade } from '../../../application/perfil.facade';
import { ActualizarPerfilRequest, RolPerfil } from '../../../domain/models/perfil';
import { PerfilRepository } from '../../../domain/repositories/perfil.repository';
import { PerfilHttpRepository } from '@features/perfil/domain/repositories/perfil-http.repository';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastService } from '@core/notifications/toast.service';

@Component({
  selector: 'app-perfil-page',
  imports: [ReactiveFormsModule],
  templateUrl: './perfil-page.component.html',
  styleUrl: './perfil-page.component.scss',
  providers: [PerfilFacade, { provide: PerfilRepository, useClass: PerfilHttpRepository }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilPageComponent implements OnInit {
  protected readonly facade = inject(PerfilFacade);
  private readonly toast = inject(ToastService);

  protected editando = false;
  protected formulario = new FormGroup({
    primerNombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    segundoNombre: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
    primerApellido: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50)],
    }),
    segundoApellido: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(50)],
    }),
  });

  protected readonly etiquetasRol: Record<RolPerfil, string> = {
    HUESPED: 'Huésped',
    ANFITRION: 'Anfitrión',
    ADMINISTRADOR: 'Administrador',
  };

  constructor() {
    effect(() => {
      if (this.facade.guardado()) {
        this.toast.success('Perfil actualizado', 'Tus datos se guardaron correctamente.');

        this.editando = false;
      }
    });
  }

  ngOnInit(): void {
    this.facade.cargar();
  }

  protected editarPerfil(): void {
    const perfil = this.facade.perfil();

    if (!perfil) {
      return;
    }

    this.formulario.setValue({
      primerNombre: perfil.primerNombre,
      segundoNombre: perfil.segundoNombre ?? '',
      primerApellido: perfil.primerApellido,
      segundoApellido: perfil.segundoApellido ?? '',
    });
    this.facade.reiniciarGuardado();
    this.editando = true;
  }

  protected cancelarEdicion(): void {
    this.editando = false;
  }

  protected guardarCambios(): void {
    if (this.formulario.invalid || this.facade.guardando()) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();

    const datos: ActualizarPerfilRequest = {
      primerNombre: valores.primerNombre.trim(),
      segundoNombre: valores.segundoNombre.trim() || null,
      primerApellido: valores.primerApellido.trim(),
      segundoApellido: valores.segundoApellido.trim() || null,
    };

    this.facade.actualizar(datos);
  }
}
