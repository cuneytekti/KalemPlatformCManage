import { AuthService } from './auth.service';

describe('AuthService şifre işlemleri', () => {
  const service = new AuthService(null as never, null as never, null as never, null as never, null as never);

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

describe('AuthService 2FA login akışı', () => {
  const { CryptoService } = require('../common/crypto.service');
  const { TotpService } = require('../common/totp.service');
  const crypto = new CryptoService({ get: () => 'test-jwt-secret' });
  const totp = new TotpService();

  function build(userRow: unknown) {
    const users = {
      createQueryBuilder: jest.fn(() => ({
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => userRow),
      })),
    };
    const jwt = { signAsync: jest.fn(async () => 'jwt-token') };
    return new AuthService(users as never, jwt as never, null as never, crypto, totp);
  }

  const passwordHash = new AuthService(null as never, null as never, null as never, null as never, null as never)
    .hashPassword('Dogru-Sifre-2026');
  const secret = totp.generateSecret();

  const totpUser = () => ({
    id: 'u1', email: 'a@b.az', name: 'A', role: 'ADMIN',
    passwordHash, totpEnabled: true, totpSecretEnc: crypto.encrypt(secret),
  });

  it('2FA etkinken kod verilmezse TOTP_REQUIRED fırlatır', async () => {
    const service = build(totpUser());
    await expect(service.login('a@b.az', 'Dogru-Sifre-2026')).rejects.toThrow('TOTP_REQUIRED');
  });

  it('2FA etkinken doğru kodla giriş başarılı', async () => {
    const service = build(totpUser());
    const code = totp.hotp(secret, Math.floor(Date.now() / 1000 / 30));
    const result = await service.login('a@b.az', 'Dogru-Sifre-2026', code);
    expect(result.accessToken).toBe('jwt-token');
  });

  it('2FA etkinken yanlış kod reddedilir', async () => {
    const service = build(totpUser());
    await expect(service.login('a@b.az', 'Dogru-Sifre-2026', '000000')).rejects.toThrow('Doğrulama kodu hatalı');
  });

  it('2FA kapalıysa kod istenmez', async () => {
    const service = build({ ...totpUser(), totpEnabled: false, totpSecretEnc: undefined });
    const result = await service.login('a@b.az', 'Dogru-Sifre-2026');
    expect(result.accessToken).toBe('jwt-token');
  });
});
