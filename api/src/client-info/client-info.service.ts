import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientInfo, ClientInfoStatus } from '../entities/client-info.entity';
import { Quote } from '../entities/quote.entity';
import { QuoteInput, QuotesService } from '../quotes/quotes.service';

@Injectable()
export class ClientInfoService {
  private readonly logger = new Logger(ClientInfoService.name);

  constructor(
    @InjectRepository(ClientInfo) private readonly repo: Repository<ClientInfo>,
    private readonly quotesService: QuotesService,
  ) {}

  findAll(): Promise<ClientInfo[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<ClientInfo> {
    const record = await this.repo.findOneBy({ id });
    if (!record) throw new NotFoundException('Kayıt bulunamadı');
    return record;
  }

  async create(data: Partial<ClientInfo>): Promise<ClientInfo> {
    const record = await this.repo.save(this.repo.create(data));
    this.logger.log(`Yeni müşteri bilgi kaydı: ${record.marketName ?? record.companyLegalName ?? record.fullName} <${record.email}>`);
    return record;
  }

  async update(id: string, data: Partial<ClientInfo>): Promise<ClientInfo> {
    const record = await this.findOne(id);
    Object.assign(record, data);
    return this.repo.save(record);
  }

  async setStatus(id: string, status: ClientInfoStatus): Promise<ClientInfo> {
    const record = await this.findOne(id);
    record.status = status;
    return this.repo.save(record);
  }

  /** Bilgi toplama kaydını, teklif formunda onaylanan değerlerle teklife dönüştürür. */
  async convertToQuote(id: string, input: QuoteInput): Promise<Quote> {
    const record = await this.findOne(id);
    if (record.quoteId) throw new BadRequestException('Bu kayıt zaten teklife dönüştürülmüş');
    if (!record.sendCommercialOffer) {
      throw new BadRequestException('Bu kayıt için ticari teklif talebi işaretlenmemiş');
    }

    const quote = await this.quotesService.create(input);

    record.quoteId = quote.id;
    if (record.status === ClientInfoStatus.NEW) record.status = ClientInfoStatus.CONTACTED;
    await this.repo.save(record);
    return quote;
  }
}
