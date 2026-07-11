import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'crypto';

/**
 * Tenant sırları (DB şifresi, JWT secret) container yeniden oluşturma için
 * gereklidir; AES-256-GCM ile şifrelenip DB'de saklanır.
 * Anahtar CMANAGE_JWT_SECRET'tan türetilir. TODO: üretimde ayrı KMS/vault.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = createHash('sha256').update(config.get<string>('jwtSecret')!).digest();
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv.toString('base64'), cipher.getAuthTag().toString('base64'), data.toString('base64')].join('.');
  }

  /**
   * Panel→tenant servis token'ı: tenant JWT secret'ından HMAC ile türetilir.
   * Kalem API aynı türetmeyi kendi KALEM_INTERNAL_TOKEN env'i ile alır;
   * /internal/license bu token ile korunur (docs/INTERNAL_LICENSE_API.md).
   */
  internalLicenseToken(jwtSecret: string): string {
    return createHmac('sha256', jwtSecret).update('kalem-internal-license').digest('hex');
  }

  decrypt(encrypted: string): string {
    const [iv, tag, data] = encrypted.split('.').map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}
