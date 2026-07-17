import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { createTransport } from 'nodemailer';
import { CryptoService } from '../common/crypto.service';
import { MailSecurityMode, MailSettings } from '../entities/mail-settings.entity';
import { MailSettingsInput } from './mail-settings.dto';
import { MailService } from './mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const validInput = (): MailSettingsInput => ({
  enabled: true,
  host: 'smtp.example.com',
  port: 587,
  security: MailSecurityMode.STARTTLS,
  authEnabled: true,
  username: 'mailer@example.com',
  password: 'new-secret',
  fromName: 'Kalem Platform',
  fromEmail: 'info@example.com',
});

function setup(stored: MailSettings | null = null) {
  const query = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn().mockResolvedValue(stored),
  };
  const repo = {
    createQueryBuilder: jest.fn(() => query),
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ ...value, updatedAt: new Date('2026-07-17T00:00:00Z') })),
  };
  const env: Record<string, unknown> = {
    'smtp.host': 'smtp.env.test', 'smtp.port': 465, 'smtp.user': 'env-user',
    'smtp.pass': 'env-secret', 'smtp.from': 'Kalem Platform <env@example.com>',
    jwtSecret: 'test-key',
  };
  const config = { get: (key: string) => env[key] };
  const crypto = new CryptoService(config as never);
  const service = new MailService(repo as never, config as never, crypto);
  return { service, repo, query, crypto };
}

describe('MailService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('panel kaydı yokken environment ayarlarını kullanır ve şifreyi dışarı vermez', async () => {
    const { service } = setup();
    await service.onModuleInit();
    expect(service.getSettings()).toEqual(expect.objectContaining({
      source: 'ENV', host: 'smtp.env.test', port: 465, passwordConfigured: true,
    }));
    expect(JSON.stringify(service.getSettings())).not.toContain('env-secret');
  });

  it('boş şifreyle kayıtta mevcut etkin şifreyi korur ve şifreli saklar', async () => {
    const { service, repo, crypto } = setup();
    await service.saveSettings({ ...validInput(), password: '' });
    const saved = repo.save.mock.calls[0][0] as MailSettings;
    expect(saved.passwordEnc).toBeDefined();
    expect(crypto.decrypt(saved.passwordEnc!)).toBe('env-secret');
    expect(service.getSettings()).toEqual(expect.objectContaining({ source: 'PANEL', passwordConfigured: true }));
  });

  it('kayıtlı panel ayarını environment değerlerinden öncelikli yükler', async () => {
    const initial = setup();
    const stored = {
      id: 'default', enabled: true, host: 'smtp.panel.test', port: 587,
      security: MailSecurityMode.STARTTLS, authEnabled: true, username: 'panel-user',
      passwordEnc: initial.crypto.encrypt('panel-secret'), fromName: 'Panel',
      fromEmail: 'panel@example.com', updatedAt: new Date('2026-07-17T00:00:00Z'),
    } as MailSettings;
    const { service } = setup(stored);
    await service.onModuleInit();
    expect(service.getSettings()).toEqual(expect.objectContaining({
      source: 'PANEL', host: 'smtp.panel.test', username: 'panel-user', passwordConfigured: true,
    }));
  });

  it.each([
    [MailSecurityMode.AUTO, 465, true, false, false],
    [MailSecurityMode.AUTO, 587, false, false, false],
    [MailSecurityMode.TLS, 587, true, false, false],
    [MailSecurityMode.STARTTLS, 587, false, true, false],
    [MailSecurityMode.NONE, 25, false, false, true],
  ])('%s güvenlik modunu doğru transporter seçeneklerine çevirir', (security, port, secure, requireTLS, ignoreTLS) => {
    expect(MailService.transportOptions({
      host: 'smtp.test', port, security, authEnabled: false, username: '', password: undefined,
    })).toEqual(expect.objectContaining({ secure, requireTLS, ignoreTLS }));
  });

  it('kimlik doğrulama açıkken kullanıcı ve şifreyi zorunlu tutar', async () => {
    const { service } = setup();
    await expect(service.saveSettings({ ...validInput(), username: '', password: '' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('gerçek test akışında bağlantıyı doğrular ve test mesajı gönderir', async () => {
    const verify = jest.fn().mockResolvedValue(true);
    const sendMail = jest.fn().mockResolvedValue({ messageId: '1' });
    jest.mocked(createTransport).mockReturnValue({ verify, sendMail } as never);
    const { service } = setup();
    await expect(service.sendTest(validInput(), 'admin@example.com')).resolves.toEqual({
      ok: true, message: 'Test e-postası admin@example.com adresine gönderildi',
    });
    expect(verify).toHaveBeenCalled();
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'admin@example.com' }));
  });

  it('SMTP test hatasını güvenli bir API hatasına dönüştürür', async () => {
    jest.mocked(createTransport).mockReturnValue({
      verify: jest.fn().mockRejectedValue(new Error('authentication failed')),
    } as never);
    const { service } = setup();
    await expect(service.sendTest(validInput(), 'admin@example.com'))
      .rejects.toThrow('SMTP testi başarısız: authentication failed');
  });
});

describe('MailSettingsInput validation', () => {
  it('geçerli SMTP DTO alanlarını kabul eder', async () => {
    expect(await validate(plainToInstance(MailSettingsInput, validInput()))).toHaveLength(0);
  });

  it('hatalı port, güvenlik modu ve e-postayı reddeder', async () => {
    const input = plainToInstance(MailSettingsInput, {
      ...validInput(), port: 70000, security: 'INVALID', fromEmail: 'hatalı',
    });
    const properties = (await validate(input)).map((error) => error.property);
    expect(properties).toEqual(expect.arrayContaining(['port', 'security', 'fromEmail']));
  });
});
