import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ConfirmacionService } from '@core/notifications/confirmacion.service';
import {
  cambiosSinGuardarGuard,
  ConCambiosSinGuardar,
  MENSAJE_CAMBIOS_SIN_GUARDAR,
} from './cambios-sin-guardar.guard';

describe('cambiosSinGuardarGuard', () => {
  let confirmacion: jasmine.SpyObj<ConfirmacionService>;

  const salir = (hayCambios: boolean) => {
    const pantalla: ConCambiosSinGuardar = { hayCambiosSinGuardar: () => hayCambios };
    return TestBed.runInInjectionContext(() =>
      cambiosSinGuardarGuard(
        pantalla,
        {} as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
        {} as RouterStateSnapshot,
      ),
    );
  };

  beforeEach(() => {
    confirmacion = jasmine.createSpyObj<ConfirmacionService>('ConfirmacionService', ['confirmar']);
    TestBed.configureTestingModule({
      providers: [{ provide: ConfirmacionService, useValue: confirmacion }],
    });
  });

  it('deja salir sin preguntar si no hay cambios', () => {
    expect(salir(false)).toBeTrue();
    expect(confirmacion.confirmar).not.toHaveBeenCalled();
  });

  it('con cambios pregunta y deja salir si la persona acepta', () => {
    confirmacion.confirmar.and.returnValue(true);

    expect(salir(true)).toBeTrue();
    expect(confirmacion.confirmar).toHaveBeenCalledOnceWith(MENSAJE_CAMBIOS_SIN_GUARDAR);
  });

  it('con cambios y sin aceptar, se queda en la pantalla', () => {
    confirmacion.confirmar.and.returnValue(false);

    expect(salir(true)).toBeFalse();
  });
});
