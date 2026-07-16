import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { License, LicenseStatus } from '../entities/license.entity';
import { Quote, QuoteDiscountType, QuoteStatus } from '../entities/quote.entity';
import { Tenant } from '../entities/tenant.entity';
import { MailService } from '../mail/mail.service';
import { TenantsService } from '../tenants/tenants.service';
import { DEFAULT_PAYMENT_TERMS, DEFAULT_PROJECT_DURATION } from './quote.defaults';
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

@Injectable()
export class QuotesService {
  constructor(
    @InjectRepository(Quote) private readonly quotes: Repository<Quote>,
    @InjectRepository(License) private readonly licenses: Repository<License>,
    private readonly tenantsService: TenantsService,
    private readonly mail: MailService,
    private readonly pdfService: QuotePdfService,
  ) {}

  findAll(): Promise<Quote[]> {
    return this.quotes.find({ order: { createdAt: 'DESC' } });
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

  async setStatus(id: string, status: QuoteStatus): Promise<Quote> {
    const quote = await this.quotes.findOneBy({ id });
    if (!quote) throw new NotFoundException('Teklif bulunamadı');
    quote.status = status;
    return this.quotes.save(quote);
  }

  /** Teklif PDF'ini müşteriye e-postayla gönderir ve SENT işaretler. */
  async sendByEmail(id: string, lang: QuoteLang): Promise<Quote> {
    const quote = await this.findOne(id);
    if (!quote.contactEmail) throw new BadRequestException('Teklifte e-posta adresi yok');
    if (!this.mail.enabled) throw new BadRequestException('SMTP yapılandırılmamış (SMTP_HOST)');
    const pdf = await this.pdfService.renderPdf(quote, lang);
    const sent = await this.mail.send(
      quote.contactEmail,
      `Kalem Platform — Qiymət Təklifi / Fiyat Teklifi (${quote.customerName})`,
      `Kalem Platform fiyat teklifiniz ektedir. / Qiymət təklifiniz əlavədədir.

Kalem Yazılım · 012 526 22 22 · info@kalemyazilim.az`,
      [{ filename: `kalem-teklif-${lang}.pdf`, content: pdf, contentType: 'application/pdf' }],
    );
    if (!sent) throw new BadRequestException('E-posta gönderilemedi');
    quote.status = QuoteStatus.SENT;
    return this.quotes.save(quote);
  }

  /**
   * Teklifi tek adımda müşteriye dönüştürür:
   * tenant oluştur (kurulum kuyruğa girer) + teklif fiyatlarıyla ACTIVE lisans + teklif ACCEPTED.
   */
  async convertToTenant(id: string, slug: string): Promise<Tenant> {
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
    return tenant;
  }
}
