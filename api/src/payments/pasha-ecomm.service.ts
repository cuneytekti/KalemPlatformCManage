import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';
import { Agent, request } from 'https';

/**
 * PashaBank ECOMM (sanal POS) istemcisi.
 *
 * Protokol: mTLS (banka tarafından verilen istemci sertifikası) ile
 * MerchantHandler'a form-urlencoded POST; yanıt "KEY: value" satırlarıdır.
 *   - Ödeme kaydı: command=v → TRANSACTION_ID
 *   - Müşteri yönlendirme: ClientHandler?trans_id=<id>
 *   - Sonuç sorgusu: command=c → RESULT / RESULT_CODE
 *   - Gün sonu: command=b
 *
 * PASHA_MERCHANT_HANDLER tanımsızsa servis devre dışıdır.
 * PASHA_MOCK=true ise banka çağrıları taklit edilir (staging uçtan uca test).
 */
@Injectable()
export class PashaEcommService {
  private readonly logger = new Logger(PashaEcommService.name);
  private readonly agent?: Agent;

  constructor(private readonly config: ConfigService) {
    const certPath = this.config.get<string>('pasha.certPath');
    const keyPath = this.config.get<string>('pasha.keyPath');
    if (this.enabled && !this.mock && certPath && keyPath) {
      this.agent = new Agent({
        cert: readFileSync(certPath),
        key: readFileSync(keyPath),
        passphrase: this.config.get<string>('pasha.keyPassphrase') || undefined,
      });
    }
  }

  get enabled(): boolean {
    return Boolean(this.config.get<string>('pasha.merchantHandler')) || this.mock;
  }

  get mock(): boolean {
    return this.config.get<boolean>('pasha.mock') === true;
  }

  /** Ödeme kaydı oluşturur; müşterinin yönlendirileceği URL'yi döner. */
  async registerTransaction(
    amountMinor: number,
    clientIp: string,
    description: string,
    language: 'az' | 'tr' | 'en' = 'az',
  ): Promise<{ transId: string; redirectUrl: string }> {
    if (this.mock) {
      const transId = `MOCK-${Buffer.from(String(Date.now())).toString('base64')}`.slice(0, 28);
      return { transId, redirectUrl: `/odeme/mock?trans_id=${encodeURIComponent(transId)}` };
    }
    const fields = await this.call({
      command: 'v',
      amount: String(amountMinor),
      currency: '944', // AZN (ISO-4217)
      client_ip_addr: clientIp,
      description: description.slice(0, 125),
      language,
      msg_type: 'SMS',
    });
    const transId = fields['TRANSACTION_ID'];
    if (!transId) throw new Error(`ECOMM kayıt hatası: ${fields['error'] ?? JSON.stringify(fields)}`);
    const clientHandler = this.config.get<string>('pasha.clientHandler')!;
    return { transId, redirectUrl: `${clientHandler}?trans_id=${encodeURIComponent(transId)}` };
  }

  /** İşlem sonucunu bankadan doğrular (asla client verisine güvenilmez). */
  async checkTransaction(transId: string, clientIp: string): Promise<{ ok: boolean; resultCode: string }> {
    if (this.mock) return { ok: true, resultCode: '000' };
    const fields = await this.call({ command: 'c', trans_id: transId, client_ip_addr: clientIp });
    return { ok: fields['RESULT'] === 'OK', resultCode: fields['RESULT_CODE'] ?? fields['RESULT'] ?? '?' };
  }

  /** Gün sonu kapanışı (banka günde bir kez ister; cron'dan çağrılır). */
  async closeBusinessDay(): Promise<void> {
    if (this.mock || !this.enabled) return;
    const fields = await this.call({ command: 'b' });
    this.logger.log(`ECOMM gün sonu: ${fields['RESULT'] ?? 'yanıt yok'}`);
  }

  /** MerchantHandler'a mTLS POST; "KEY: value" satırlarını ayrıştırır. */
  private call(params: Record<string, string>): Promise<Record<string, string>> {
    const url = new URL(this.config.get<string>('pasha.merchantHandler')!);
    const body = new URLSearchParams(params).toString();
    return new Promise((resolve, reject) => {
      const req = request(
        {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: 'POST',
          agent: this.agent,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
          timeout: 20_000,
        },
        (res) => {
          let data = '';
          res.on('data', (c: Buffer) => (data += c.toString()));
          res.on('end', () => resolve(PashaEcommService.parse(data)));
        },
      );
      req.on('timeout', () => req.destroy(new Error('ECOMM zaman aşımı')));
      req.on('error', reject);
      req.end(body);
    });
  }

  /** "KEY: value" satır formatını nesneye çevirir. */
  static parse(raw: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const idx = line.indexOf(':');
      if (idx > 0) out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return out;
  }
}
