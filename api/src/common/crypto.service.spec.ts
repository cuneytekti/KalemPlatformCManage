import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  const service = new CryptoService({ get: () => 'test-secret' } as never);

  it('şifreler ve geri çözer', () => {
    const plain = 'çok-gizli-db-şifresi-123!';
    expect(service.decrypt(service.encrypt(plain))).toBe(plain);
  });

  it('her şifrelemede farklı çıktı üretir (rastgele IV)', () => {
    expect(service.encrypt('a')).not.toBe(service.encrypt('a'));
  });

  it('kurcalanan veriyi reddeder', () => {
    const enc = service.encrypt('veri');
    const [iv, tag, data] = enc.split('.');
    const tampered = [iv, tag, Buffer.from('bozuk-veri!!').toString('base64')].join('.');
    expect(() => service.decrypt(tampered)).toThrow();
    void data;
  });

  it('farklı anahtarla çözülemez', () => {
    const other = new CryptoService({ get: () => 'baska-anahtar' } as never);
    expect(() => other.decrypt(service.encrypt('veri'))).toThrow();
  });
});
