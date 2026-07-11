import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * RFC 6238 TOTP (SHA-1, 6 hane, 30 sn adım) — Google Authenticator ve
 * benzeri uygulamalarla uyumlu. Ek bağımlılık gerektirmez.
 */
@Injectable()
export class TotpService {
  /** Yeni 2FA sırrı (20 bayt) — base32 kodlu. */
  generateSecret(): string {
    return TotpService.base32Encode(randomBytes(20));
  }

  /** Authenticator uygulamalarının okuduğu kurulum URL'si. */
  otpauthUrl(secret: string, account: string, issuer = 'Kalem CManage'): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
  }

  /** Kodu doğrular; saat kayması için ±1 adım (30 sn) tolerans. */
  verify(secret: string, code: string, now: number = Date.now()): boolean {
    if (!/^\d{6}$/.test(code)) return false;
    const counter = Math.floor(now / 1000 / 30);
    for (const c of [counter - 1, counter, counter + 1]) {
      const expected = Buffer.from(this.hotp(secret, c));
      const given = Buffer.from(code);
      if (expected.length === given.length && timingSafeEqual(expected, given)) return true;
    }
    return false;
  }

  /** RFC 4226 HOTP — 6 haneli kod. */
  hotp(secret: string, counter: number): string {
    const key = TotpService.base32Decode(secret);
    const msg = Buffer.alloc(8);
    msg.writeBigUInt64BE(BigInt(counter));
    const digest = createHmac('sha1', key).update(msg).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const bin =
      ((digest[offset] & 0x7f) << 24) |
      (digest[offset + 1] << 16) |
      (digest[offset + 2] << 8) |
      digest[offset + 3];
    return String(bin % 1_000_000).padStart(6, '0');
  }

  static base32Encode(buf: Buffer): string {
    let bits = 0, value = 0, out = '';
    for (const byte of buf) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
    return out;
  }

  static base32Decode(s: string): Buffer {
    let bits = 0, value = 0;
    const out: number[] = [];
    for (const ch of s.toUpperCase().replace(/=+$/, '')) {
      const idx = B32_ALPHABET.indexOf(ch);
      if (idx < 0) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return Buffer.from(out);
  }
}
