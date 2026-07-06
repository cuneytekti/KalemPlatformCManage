import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead, LeadStatus } from '../entities/lead.entity';
import { Quote } from '../entities/quote.entity';
import { MailService } from '../mail/mail.service';
import { QuotesService } from '../quotes/quotes.service';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
    private readonly quotesService: QuotesService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  findAll(): Promise<Lead[]> {
    return this.leads.find({ order: { createdAt: 'DESC' } });
  }

  async create(data: Partial<Lead>): Promise<Lead> {
    const lead = await this.leads.save(this.leads.create(data));
    this.logger.log(`Yeni başvuru: ${lead.company} <${lead.email}>`);
    // Satış ekibine bildirim (SMTP yapılandırılmışsa)
    void this.mail.send(
      this.config.get<string>('admin.email')!,
      `Yeni demo başvurusu: ${lead.company}`,
      `Şirket: ${lead.company}
İlgili: ${lead.name}
E-posta: ${lead.email}
Telefon: ${lead.phone ?? '-'}
Konfigürasyon: ${lead.config ?? '-'}

${lead.message ?? ''}

Panel: https://panel.kalemplatform.com/leads`,
    );
    return lead;
  }

  /**
   * Başvuruyu tek tıkla teklife dönüştürür: hesaplayıcı konfigürasyonu
   * miktarlara ayrıştırılır, varsayılan birim fiyatlarla DRAFT teklif oluşur.
   */
  async convertToQuote(id: string): Promise<Quote> {
    const lead = await this.leads.findOneBy({ id });
    if (!lead) throw new NotFoundException('Başvuru bulunamadı');
    if (lead.quoteId) throw new BadRequestException('Bu başvuru zaten teklife dönüştürülmüş');

    // "users=5, pos=2, mobile=0, monthly=173 AZN" → miktarlar
    const num = (key: string, fallback: number) => {
      const m = lead.config?.match(new RegExp(`${key}=(\d+)`));
      return m ? parseInt(m[1], 10) : fallback;
    };
    const prices = this.config.get<{ user: string; pos: string; mobile: string }>('defaultPrices')!;

    const quote = await this.quotesService.create({
      customerName: lead.company,
      contactEmail: lead.email,
      seats: num('users', 5),
      posTerminals: num('pos', 1),
      mobileTerminals: num('mobile', 0),
      pricePerUser: prices.user,
      pricePerPosTerminal: prices.pos,
      pricePerMobileTerminal: prices.mobile,
      currency: 'AZN',
      notes: `Web başvurusu (${lead.name}${lead.phone ? ', ' + lead.phone : ''})${lead.message ? ': ' + lead.message : ''}`,
    });

    lead.quoteId = quote.id;
    if (lead.status === LeadStatus.NEW) lead.status = LeadStatus.CONTACTED;
    await this.leads.save(lead);
    return quote;
  }

  async setStatus(id: string, status: LeadStatus): Promise<Lead> {
    const lead = await this.leads.findOneBy({ id });
    if (!lead) throw new NotFoundException('Başvuru bulunamadı');
    lead.status = status;
    return this.leads.save(lead);
  }
}
