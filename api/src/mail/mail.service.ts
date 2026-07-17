import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createTransport } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Repository } from 'typeorm';
import { CryptoService } from '../common/crypto.service';
import { MailSecurityMode, MailSettings } from '../entities/mail-settings.entity';
import type { MailSettingsInput } from './mail-settings.dto';

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface MailSettingsView {
  enabled: boolean;
  host: string;
  port: number;
  security: MailSecurityMode;
  authEnabled: boolean;
  username: string;
  passwordConfigured: boolean;
  fromName: string;
  fromEmail: string;
  source: 'ENV' | 'PANEL';
  updatedAt?: string;
}

interface EffectiveMailSettings extends Omit<MailSettingsView, 'passwordConfigured'> {
  password?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private current: EffectiveMailSettings;

  constructor(
    @InjectRepository(MailSettings) private readonly settings: Repository<MailSettings>,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
  ) {
    this.current = this.environmentSettings();
  }

  async onModuleInit(): Promise<void> {
    const stored = await this.findStored();
    if (stored) this.current = this.fromEntity(stored);
    if (!this.enabled) this.logger.warn('SMTP yapılandırılmamış — e-posta gönderimi devre dışı');
  }

  get enabled(): boolean {
    return this.current.enabled && Boolean(this.current.host && this.current.fromEmail);
  }

  getSettings(): MailSettingsView {
    return this.toView(this.current);
  }

  async saveSettings(input: MailSettingsInput): Promise<MailSettingsView> {
    const password = input.password || this.current.password;
    const candidate = this.normalize(input, password);
    this.validate(candidate);
    const entity = this.settings.create({
      id: 'default',
      enabled: candidate.enabled,
      host: candidate.host,
      port: candidate.port,
      security: candidate.security,
      authEnabled: candidate.authEnabled,
      username: candidate.username || undefined,
      passwordEnc: candidate.password
        ? this.crypto.encrypt(candidate.password)
        : undefined,
      fromName: candidate.fromName,
      fromEmail: candidate.fromEmail,
    });
    const saved = await this.settings.save(entity);
    this.current = { ...candidate, source: 'PANEL', updatedAt: saved.updatedAt.toISOString() };
    this.logger.log(`SMTP panel ayarları güncellendi: ${candidate.host}:${candidate.port}`);
    return this.toView(this.current);
  }

  async sendTest(input: MailSettingsInput, recipient: string): Promise<{ ok: true; message: string }> {
    const candidate = this.normalize(input, input.password || this.current.password);
    this.validate(candidate);
    if (!candidate.enabled) throw new BadRequestException('Test için e-posta gönderimini etkinleştirin');
    const transporter = createTransport(MailService.transportOptions(candidate));
    try {
      await transporter.verify();
      await transporter.sendMail({
        from: { name: candidate.fromName, address: candidate.fromEmail },
        to: recipient,
        subject: 'CManage SMTP Testi — Kalem Platform',
        text: 'SMTP ayarlarınız başarıyla doğrulandı. Bu mesaj CManage Ayarlar ekranından gönderilmiştir.',
      });
      return { ok: true, message: `Test e-postası ${recipient} adresine gönderildi` };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`SMTP testi başarısız: ${message}`);
      throw new BadRequestException(`SMTP testi başarısız: ${message}`);
    }
  }

  async send(
    to: string,
    subject: string,
    text: string,
    attachments: MailAttachment[] = [],
  ): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      const transporter = createTransport(MailService.transportOptions(this.current));
      await transporter.sendMail({
        from: { name: this.current.fromName, address: this.current.fromEmail },
        to,
        subject,
        text,
        attachments,
      });
      this.logger.log(`E-posta gönderildi: ${to} — ${subject}`);
      return true;
    } catch (error) {
      this.logger.error(`E-posta gönderilemedi (${to}): ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }

  static transportOptions(settings: Pick<EffectiveMailSettings, 'host' | 'port' | 'security' | 'authEnabled' | 'username' | 'password'>): SMTPTransport.Options {
    const secure = settings.security === MailSecurityMode.TLS
      || (settings.security === MailSecurityMode.AUTO && settings.port === 465);
    return {
      host: settings.host,
      port: settings.port,
      secure,
      requireTLS: settings.security === MailSecurityMode.STARTTLS,
      ignoreTLS: settings.security === MailSecurityMode.NONE,
      auth: settings.authEnabled ? { user: settings.username, pass: settings.password } : undefined,
    };
  }

  private normalize(input: MailSettingsInput, password?: string): EffectiveMailSettings {
    return {
      enabled: input.enabled,
      host: input.host.trim(),
      port: input.port,
      security: input.security,
      authEnabled: input.authEnabled,
      username: input.username?.trim() ?? '',
      password,
      fromName: input.fromName.trim(),
      fromEmail: input.fromEmail.trim().toLowerCase(),
      source: 'PANEL',
    };
  }

  private validate(settings: EffectiveMailSettings): void {
    if (!settings.enabled) return;
    if (!settings.host) throw new BadRequestException('SMTP sunucusu zorunludur');
    if (settings.authEnabled && !settings.username) throw new BadRequestException('SMTP kullanıcı adı zorunludur');
    if (settings.authEnabled && !settings.password) throw new BadRequestException('SMTP şifresi zorunludur');
  }

  private async findStored(): Promise<MailSettings | null> {
    return this.settings.createQueryBuilder('mail')
      .addSelect('mail.passwordEnc')
      .where('mail.id = :id', { id: 'default' })
      .getOne();
  }

  private fromEntity(entity: MailSettings): EffectiveMailSettings {
    return {
      enabled: entity.enabled,
      host: entity.host,
      port: entity.port,
      security: entity.security,
      authEnabled: entity.authEnabled,
      username: entity.username ?? '',
      password: entity.passwordEnc ? this.crypto.decrypt(entity.passwordEnc) : undefined,
      fromName: entity.fromName,
      fromEmail: entity.fromEmail,
      source: 'PANEL',
      updatedAt: entity.updatedAt.toISOString(),
    };
  }

  private environmentSettings(): EffectiveMailSettings {
    const from = this.config.get<string>('smtp.from') ?? 'Kalem Platform <info@kalemyazilim.az>';
    const match = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    const host = this.config.get<string>('smtp.host') ?? '';
    return {
      enabled: Boolean(host),
      host,
      port: this.config.get<number>('smtp.port') ?? 587,
      security: MailSecurityMode.AUTO,
      authEnabled: Boolean(this.config.get<string>('smtp.user')),
      username: this.config.get<string>('smtp.user') ?? '',
      password: this.config.get<string>('smtp.pass') || undefined,
      fromName: match?.[1]?.trim() || 'Kalem Platform',
      fromEmail: (match?.[2] ?? from).trim(),
      source: 'ENV',
    };
  }

  private toView(settings: EffectiveMailSettings): MailSettingsView {
    return {
      enabled: settings.enabled,
      host: settings.host,
      port: settings.port,
      security: settings.security,
      authEnabled: settings.authEnabled,
      username: settings.username,
      passwordConfigured: Boolean(settings.password),
      fromName: settings.fromName,
      fromEmail: settings.fromEmail,
      source: settings.source,
      updatedAt: settings.updatedAt,
    };
  }
}
