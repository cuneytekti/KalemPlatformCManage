import { AuthService } from './auth.service';

describe('AuthService şifre işlemleri', () => {
  const service = new AuthService(null as never, null as never, null as never);

  it('hash doğru şifreyle doğrulanır', () => {
    const hash = service.hashPassword('Güçlü-Şifre-2026');
    expect(service.verifyPassword('Güçlü-Şifre-2026', hash)).toBe(true);
  });

  it('yanlış şifre reddedilir', () => {
    const hash = service.hashPassword('dogru-sifre');
    expect(service.verifyPassword('yanlis-sifre', hash)).toBe(false);
  });

  it('her hash farklı salt kullanır', () => {
    expect(service.hashPassword('x')).not.toBe(service.hashPassword('x'));
  });

  it('bozuk hash formatı false döner', () => {
    expect(service.verifyPassword('x', 'gecersiz')).toBe(false);
    expect(service.verifyPassword('x', 'md5$abc$def')).toBe(false);
  });
});
