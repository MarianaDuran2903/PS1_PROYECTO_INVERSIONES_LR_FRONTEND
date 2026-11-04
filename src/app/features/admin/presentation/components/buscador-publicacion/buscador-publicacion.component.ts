import { ChangeDetectionStrategy, Component, ElementRef, inject, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { enteroPositivo, notBlank } from '@shared/validators/form.validators';

const MENSAJE_NUMERO = 'El número de publicación debe ser un entero mayor que 0';

/**
 * Pide el número de una publicación y lo emite. Es la entrada provisional del Administrador:
 * el backend solo permite consultar por id. Cuando exista una bandeja de publicaciones, este
 * componente se reemplaza por ella sin tocar la pantalla de intervención.
 */
@Component({
  selector: 'app-buscador-publicacion',
  imports: [ReactiveFormsModule],
  templateUrl: './buscador-publicacion.component.html',
  styleUrl: './buscador-publicacion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuscadorPublicacionComponent {
  /** Número de la publicación elegida. */
  readonly buscar = output<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly form = inject(NonNullableFormBuilder).group({
    numero: ['', [Validators.required, notBlank(), enteroPositivo()]],
  });

  protected error(): string | null {
    return this.form.controls.numero.touched && this.form.controls.numero.invalid
      ? MENSAJE_NUMERO
      : null;
  }

  protected enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement.querySelector<HTMLElement>('#numeroPublicacion')?.focus();
      return;
    }
    this.buscar.emit(Number(this.form.controls.numero.value.trim()));
  }
}
