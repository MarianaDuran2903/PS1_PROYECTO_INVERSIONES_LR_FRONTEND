import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RedireccionExterna } from './redireccion-externa.service';

@Injectable()
class RedireccionCapturada extends RedireccionExterna {
  readonly destinos: string[] = [];

  protected override navegar(url: string): void {
    this.destinos.push(url);
  }
}

describe('RedireccionExterna', () => {
  let redireccion: RedireccionCapturada;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: RedireccionExterna, useClass: RedireccionCapturada }],
    });
    redireccion = TestBed.inject(RedireccionExterna) as RedireccionCapturada;
  });

  it('redirige a una dirección https y lo confirma', () => {
    const url = 'https://checkout.stripe.com/c/pay/cs_test_abc#fid';

    expect(redireccion.ir(url)).toBeTrue();
    expect(redireccion.destinos).toEqual([url]);
  });

  for (const url of [
    'http://checkout.stripe.com/c/pay/cs_test_abc',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    '//checkout.stripe.com/c/pay',
    '/ruta/interna',
    'no es una url',
    '',
  ]) {
    it(`no redirige a "${url}"`, () => {
      expect(redireccion.ir(url)).toBeFalse();
      expect(redireccion.destinos).toEqual([]);
    });
  }

  it('no redirige si no hay dirección', () => {
    expect(redireccion.ir(null)).toBeFalse();
    expect(redireccion.ir(undefined)).toBeFalse();
    expect(redireccion.destinos).toEqual([]);
  });
});
