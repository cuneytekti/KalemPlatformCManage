import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { License, LicenseStatus } from '../entities/license.entity';
import { QuoteActivity, QuoteActivityType } from '../entities/quote-activity.entity';
import { Quote, QuoteDiscountType, QuoteStatus } from '../entities/quote.entity';
import { Tenant } from '../entities/tenant.entity';
import { MailService } from '../mail/mail.service';
import { TenantsService } from '../tenants/tenants.service';
import { DEFAULT_PAYMENT_TERMS, DEFAULT_PROJECT_DURATION } from './quote.defaults';
import { QuoteEmailService } from './quote-email.service';
import { QuoteLang, QuotePdfService } from './quote-pdf.service';

export interface QuoteInput {
  customerName: string;
  contactName?: string;
  contactEmail?: string;
  seats: number;
  posTerminals: number;
  mobileTerminals: number;
  pricePerUser: string;
  pricePerPosTerminal: string;
  pricePerMobileTerminal: string;
  currency?: string;
  notes?: string;
  setupFee?: string;
  discountType?: QuoteDiscountType;
  discountValue?: string;
  projectDurationText?: string;
  paymentTermsText?: string;
}

export interface QuoteActivityInput {
  type: QuoteActivityType;
  status?: QuoteStatus;
  note: string;
  activityAt?: string;
}

export type QuoteWithLastActivity = Quote & { lastActivity?: QuoteActivity };

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote) private readonly quotes: Repository<Quote>,
    @InjectRepository(QuoteActivity) private readonly activities: Repository<QuoteActivity>,
    @InjectRepository(License) private readonly licenses: Repository<License>,
    private readonly dataSource: DataSource,
    private readonly tenantsService: TenantsService,
    private readonly mail: MailService,
    private readonly pdfService: QuotePdfService,
    private readonly emailService: QuoteEmailService,
  ) {}

  async findAll(): Promise<QuoteWithLastActivity[]> {
    const quotes = await this.quotes.find({ order: { createdAt: 'DESC' } });
    if (quotes.length === 0) return quotes;
    const activities = await this.activities.find({
      where: { quoteId: In(quotes.map((quote) => quote.id)) },
      order: { activityAt: 'DESC', createdAt: 'DESC' },
    });
    const latest = new Map<string, QuoteActivity>();
    for (const activity of activities) {
      if (!latest.has(activity.quoteId)) latest.set(activity.quoteId, activity);
    }
    return quotes.map((quote) => Object.assign(quote, { lastActivity: latest.get(quote.id) }));
  }

  async findOne(id: string): Promise<Quote> {
    const quote = await this.quotes.findOneBy({ id });
    if (!quote) throw new NotFoundException('Teklif bulunamadı');
    return quote;
  }

  /** Aylık toplam: kullanıcı×birim + kasa×birim + terminal×birim (kuruş hassasiyeti) */
  static computeMonthlyTotal(input: QuoteInput): string {
    const cents = (v: string) => QuotesService.toCents(v, 'Birim fiyat');
    const total =
      input.seats * cents(input.pricePerUser) +
      input.posTerminals * cents(input.pricePerPosTerminal) +
      input.mobileTerminals * cents(input.pricePerMobileTerminal);
    return (total / 100).toFixed(2);
  }

  static computeFinancials(input: QuoteInput): {
    monthlyTotal: string;
    setupNetTotal: string;
    firstYearTotal: string;
  } {
    const monthlyCents = QuotesService.toCents(QuotesService.computeMonthlyTotal(input), 'Aylık toplam');
    const setupCents = QuotesService.toCents(input.setupFee ?? '0', 'Kurulum bedeli');
    const discountType = input.discountType ?? QuoteDiscountType.NONE;
    const discountValue = input.discountValue ?? '0';
    let discountCents = 0;

    if (discountType === QuoteDiscountType.FIXED) {
      discountCents = QuotesService.toCents(discountValue, 'İndirim');
      if (discountCents > setupCents) {
        throw new BadRequestException('Sabit indirim kurulum bedelini aşamaz');
      }
    } else if (discountType === QuoteDiscountType.PERCENT) {
      const percent = Number(discountValue);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new BadRequestException('Yüzde indirim 0 ile 100 arasında olmalıdır');
      }
      discountCents = Math.round((setupCents * percent) / 100);
    }

    const setupNetCents = setupCents - discountCents;
    return {
      monthlyTotal: (monthlyCents / 100).toFixed(2),
      setupNetTotal: (setupNetCents / 100).toFixed(2),
      firstYearTotal: ((monthlyCents * 12 + setupNetCents) / 100).toFixed(2),
    };
  }

  async create(input: QuoteInput): Promise<Quote> {
    const id = randomUUID();
    const discountType = input.discountType ?? QuoteDiscountType.NONE;
    const normalized = {
      ...input,
      id,
      quoteNumber: `KL-${new Date().getFullYear()}-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`,
      setupFee: input.setupFee ?? '0',
      discountType,
      discountValue: discountType === QuoteDiscountType.NONE ? '0' : (input.discountValue ?? '0'),
      projectDurationText: input.projectDurationText?.trim() || DEFAULT_PROJECT_DURATION,
      paymentTermsText: input.paymentTermsText?.trim() || DEFAULT_PAYMENT_TERMS,
      ...QuotesService.computeFinancials(input),
    };
    return this.quotes.save(this.quotes.create(normalized));
  }

  private static toCents(value: string, label: string): number {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      throw new BadRequestException(`${label} sıfır veya pozitif bir sayı olmalıdır`);
    }
    return Math.round(number * 100);
  }

  async getActivities(id: string): Promise<QuoteActivity[]> {
    await this.findOne(id);
    return this.activities.find({
      where: { quoteId: id },
      order: { activityAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async setStatus(id: string, status: QuoteStatus, createdByEmail: string | undefined, note: string): Promise<Quote> {
    await this.addActivity(id, {
      type: QuoteActivityType.STATUS_CHANGE,
      status,
      note,
    }, createdByEmail);
    return this.findOne(id);
  }

  async addActivity(id: string, input: QuoteActivityInput, createdByEmail?: string): Promise<QuoteActivity> {
    const note = input.note?.trim();
    if (!note || note.length < 2) throw new BadRequestException('Süreç notu zorunludur');
    const activityAt = input.activityAt ? new Date(input.activityAt) : new Date();
    if (Number.isNaN(activityAt.getTime())) throw new BadRequestException('İşlem tarihi geçersiz');
    if (input.type === QuoteActivityType.STATUS_CHANGE && !input.status) {
      throw new BadRequestException('Durum değişikliği için yeni durum zorunludur');
    }

    return this.dataSource.transaction(async (manager) => {
      const quoteRepository = manager.getRepository(Quote);
      const activityRepository = manager.getRepository(QuoteActivity);
      const quote = await quoteRepository.findOneBy({ id });
      if (!quote) throw new NotFoundException('Teklif bulunamadı');
      const nextStatus = input.status ?? this.statusForActivity(input.type, quote.status);
      if (nextStatus !== quote.status) {
        quote.status = nextStatus;
        await quoteRepository.save(quote);
      }
      return activityRepository.save(activityRepository.create({
        quoteId: id,
        type: input.type,
        status: nextStatus,
        note,
        activityAt,
        createdByEmail,
      }));
    });
  }

  /** Teklif PDF'ini müşteriye e-postayla gönderir ve SENT işaretler. */
  async sendByEmail(id: string, lang: QuoteLang, createdByEmail?: string): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote.contactEmail) throw new BadRequestException('Teklifte e-posta adresi yok');
    if (!this.mail.enabled) throw new BadRequestException('SMTP yapılandırılmamış. Ayarlar > Mail Ayarları bölümünü kontrol edin');
    const pdf = await this.pdfService.renderPdf(quote, lang);
    const email = this.emailService.build(quote, lang);
    const sent = await this.mail.send(
      quote.contactEmail,
      email.subject,
      email.text,
      [
        { filename: email.attachmentFilename, content: pdf, contentType: 'application/pdf' },
        { filename: 'kalem-logo.png', content: email.logo, contentType: 'image/png', cid: email.logoCid, contentDisposition: 'inline' },
      ],
      email.html,
    );
    if (!sent) throw new BadRequestException('E-posta gönderilemedi');
    const sentAt = new Date();
    await this.dataSource.transaction(async (manager) => {
      quote.status = QuoteStatus.SENT;
      quote.sentLanguage = lang;
      quote.sentAt = sentAt;
      await manager.getRepository(Quote).save(quote);
      await manager.getRepository(QuoteActivity).save(manager.getRepository(QuoteActivity).create({
        quoteId: quote.id,
        type: QuoteActivityType.EMAIL_SENT,
        status: QuoteStatus.SENT,
        note: this.sentActivityNote(lang, quote.contactEmail!),
        activityAt: sentAt,
        createdByEmail,
      }));
    });
    return quote;
  }

  /**
   * Teklifi tek adımda müşteriye dönüştürür:
   * tenant oluştur (kurulum kuyruğa girer) + teklif fiyatlarıyla ACTIVE lisans + teklif ACCEPTED.
   */
  async convertToTenant(id: string, slug: string, createdByEmail?: string): Promise<Tenant> {
    const quote = await this.findOne(id);
    if (quote.tenantId) throw new BadRequestException('Bu teklif zaten müşteriye dönüştürülmüş');

    const tenant = await this.tenantsService.createAndProvision({
      name: quote.customerName,
      slug,
      contactEmail: quote.contactEmail,
      licensedUsers: quote.seats,
      licensedPosTerminals: quote.posTerminals,
      licensedMobileTerminals: quote.mobileTerminals,
    });

    await this.licenses.save(
      this.licenses.create({
        tenantId: tenant.id,
        seats: quote.seats,
        posTerminals: quote.posTerminals,
        mobileTerminals: quote.mobileTerminals,
        pricePerUser: quote.pricePerUser,
        pricePerPosTerminal: quote.pricePerPosTerminal,
        pricePerMobileTerminal: quote.pricePerMobileTerminal,
        currency: quote.currency,
        validFrom: new Date().toISOString().slice(0, 10),
        status: LicenseStatus.ACTIVE,
      }),
    );

    quote.status = QuoteStatus.ACCEPTED;
    quote.tenantId = tenant.id;
    await this.quotes.save(quote);
    await this.activities.save(this.activities.create({
      quoteId: quote.id,
      type: QuoteActivityType.STATUS_CHANGE,
      status: QuoteStatus.ACCEPTED,
      note: 'Teklif kabul edildi ve müşteri kurulumu başlatıldı.',
      activityAt: new Date(),
      createdByEmail,
    }));
    return tenant;
  }

  private statusForActivity(type: QuoteActivityType, current: QuoteStatus): QuoteStatus {
    if (type === QuoteActivityType.PHONE_CALL || type === QuoteActivityType.VISIT) return QuoteStatus.FOLLOW_UP;
    if (type === QuoteActivityType.MEETING) return QuoteStatus.MEETING;
    return current;
  }

  private sentActivityNote(lang: QuoteLang, email: string): string {
    const language = lang === 'az' ? 'Azerbaycanca' : lang === 'tr' ? 'Türkçe' : 'İngilizce';
    return `Teklif ${email} adresine ${language} olarak gönderildi.`;
  }
}
