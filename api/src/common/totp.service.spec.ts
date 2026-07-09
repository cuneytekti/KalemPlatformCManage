import { TotpService } from './totp.service';

describe('TotpService (RFC 4226/6238)', () => {
  const totp = new TotpService();
  // RFC 4226 Ek D test vektörleri: ASCII "12345678901234567890"
  const RFC_SECRET_B32 = TotpService.base32Encode(Buffer.from('12345678901234567890'));
  const RFC_HOTP = ['755224', '287082', '359152', '969429', '338314', '254676', '287922', '162583', '399871', '520489'];

  it('HOTP, RFC 4226 test vektörleriyle birebir uyuşur', () => {
    RFC_HOTP.forEach((expected, counter) => {
      expect(totp.hotp(RFC_SECRET_B32, counter)).toBe(expected);
    });
  });

  it('base32 gidiş-dönüş kayıpsızdır', () => {
    const buf = Buffer.from('12345678901234567890');
    expect(TotpService.base32Decode(TotpService.base32Encode(buf)).equals(buf)).toBe(true);
  });

  it('doğru kod ±1 adım penceresinde kabul edilir', () => {
    const secret = totp.generateSecret();
    const now = 1_700_000_000_000;
    const code = totp.hotp(secret, Math.floor(now / 1000 / 30));
    expect(totp.verify(secret, code, now)).toBe(true);
    expect(totp.verify(secret, code, now + 30_000)).toBe(true); // bir adım sonrası
    expect(totp.verify(secret, code, now + 90_000)).toBe(false); // pencere dışı
  });

  it('hatalı format ve yanlış kod reddedilir', () => {
    const secret = totp.generateSecret();
    expect(totp.verify(secret, 'abc123')).toBe(false);
    expect(totp.verify(secret, '12345')).toBe(false);
    expect(totp.verify(secret, '000000', 1_700_000_000_000)).toBe(false);
  });

  it('otpauth URL doğru bileşenleri içerir', () => {
    const url = totp.otpauthUrl('SECRET234', 'admin@kalemplatform.com');
    expect(url).toContain('otpauth://totp/');
    expect(url).toContain('secret=SECRET234');
    expect(url).toContain('digits=6');
  });
});
