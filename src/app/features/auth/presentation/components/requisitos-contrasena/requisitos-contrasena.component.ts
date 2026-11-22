import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  analizarContrasena,
  PASSWORD_MAX_BYTES,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@shared/validators/form.validators';

export interface RequisitoContrasena {
  clave: string;
  texto: string;
  cumple: boolean;
}

/**
 * Lista de requisitos de la contraseña con su indicador en vivo. Usa las mismas reglas que el
 * validador del formulario (`analizarContrasena`), así que no hay dos versiones de la regla.
 */
@Component({
  selector: 'app-requisitos-contrasena',
  templateUrl: './requisitos-contrasena.component.html',
  styleUrl: './requisitos-contrasena.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequisitosContrasenaComponent {
  readonly valor = input('');

  protected readonly requisitos = computed<RequisitoContrasena[]>(() => {
    const valor = this.valor();
    const composicion = analizarContrasena(valor);
    const largo = valor.length;
    const lista: RequisitoContrasena[] = [
      {
        clave: 'largo',
        texto: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
        cumple: largo >= PASSWORD_MIN_LENGTH && largo <= PASSWORD_MAX_LENGTH,
      },
      { clave: 'mayuscula', texto: 'Una letra mayúscula', cumple: composicion.mayuscula },
      { clave: 'minuscula', texto: 'Una letra minúscula', cumple: composicion.minuscula },
      { clave: 'numero', texto: 'Un número', cumple: composicion.numero },
      { clave: 'especial', texto: 'Un carácter especial', cumple: composicion.especial },
      {
        clave: 'espacios',
        texto: 'Sin espacios',
        cumple: valor.length > 0 && !composicion.espacio,
      },
    ];
    // Solo aparece cuando se pasa: las tildes, la ñ y los símbolos ocupan más de un byte.
    if (composicion.bytes > PASSWORD_MAX_BYTES) {
      lista.push({
        clave: 'bytes',
        texto: `Máximo ${PASSWORD_MAX_BYTES} bytes: reduce las tildes, la ñ o los símbolos`,
        cumple: false,
      });
    }
    return lista;
  });
}
