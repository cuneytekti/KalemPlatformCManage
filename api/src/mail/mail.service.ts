import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

/**
 * SMTP e-posta servisi. SMTP_HOST tanımlı değilse sessizce devre dışı kalır
 * (gönderimler false döner, akışlar kırılmaz).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter?: Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('smtp.host');
    this.from = config.get<string>('smtp.from')!;
    if (host) {
      this.transporter = createTransport({
        host,
        port: config.get<number>('smtp.port'),
        secure: config.get<number>('smtp.port') === 465,
        auth: config.get<string>('smtp.user')
          ? { user: config.get<string>('smtp.user'), pass: config.get<string>('smtp.pass') }
          : undefined,
      });
    } else {
      this.logger.warn('SMTP_HOST tanımlı değil — e-posta gönderimi devre dışı');
    }
  }

  get enabled(): boolean {
    return Boolean(this.transporter);
  }

  async send(
    to: string,
    subject: string,
    text: string,
    attachments: MailAttachment[] = [],
  ): Promise<boolean> {
    if (!this.transporter) return false;
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, text, attachments });
      this.logger.log(`E-posta gönderildi: ${to} — ${subject}`);
      return true;
    } catch (err) {
      this.logger.error(`E-posta gönderilemedi (${to}): ${err instanceof Error ? err.message : err}`);
      return false;
    }
  }
}
