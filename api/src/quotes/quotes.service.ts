import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { License, LicenseStatus } from '../entities/license.entity';
import { Quote, QuoteStatus } from '../entities/quote.entity';
import { Tenant } from '../entities/tenant.entity';
import { MailService } from '../mail/mail.service';
import { TenantsService } from '../tenants/tenants.service';
import { QuoteLang, QuotePdfService } from './quote-pdf.service';

export interface QuoteInput {
  customerName: string;
  contactEmail?: string;
  seats: number;
  posTerminals: number;
  mobileTerminals: number;
  pricePerUser: string;
  pricePerPosTerminal: string;
  pricePerMobileTerminal: string;
  currency?: string;
  notes?: string;
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
    const cents = (v: string) => Math.round(parseFloat(v) * 100);
    const total =
      input.seats * cents(input.pricePerUser) +
      input.posTerminals * cents(input.pricePerPosTerminal) +
      input.mobileTerminals * cents(input.pricePerMobileTerminal);
    return (total / 100).toFixed(2);
  }

  create(input: QuoteInput): Promise<Quote> {
    return this.quotes.save(
      this.quotes.create({ ...input, monthlyTotal: QuotesService.computeMonthlyTotal(input) }),
    );
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
