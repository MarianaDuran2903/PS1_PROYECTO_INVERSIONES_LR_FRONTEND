import { inject, Provider } from '@angular/core';
import { APP_CONFIG } from '@core/config/app-config';
import { AuthRepository } from '../domain/repositories/auth.repository';
import { AuthHttpRepository } from './repositories/auth-http.repository';
import { AuthMockRepository } from './repositories/auth-mock.repository';

/** Factory: elige la implementación del repositorio según el entorno. */
export function provideAuthData(): Provider[] {
  return [
    AuthHttpRepository,
    {
      provide: AuthRepository,
      useFactory: () =>
        inject(APP_CONFIG).useMockApi ? new AuthMockRepository() : inject(AuthHttpRepository),
    },
  ];
}
