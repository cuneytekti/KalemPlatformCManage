import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientInfo, ClientInfoStatus } from '../entities/client-info.entity';
import { Quote } from '../entities/quote.entity';
import { QuotesService } from '../quotes/quotes.service';

@Injectable()
export class ClientInfoService {
  private readonly logger = new Logger(ClientInfoService.name);

  constructor(
    @InjectRepository(ClientInfo) private readonly repo: Repository<ClientInfo>,
    private readonly quotesService: QuotesService,
    private readonly config: ConfigService,
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

  /**
   * Kaydı tek tıkla DRAFT teklife dönüştürür.
   * Eşleme: kompüter sayı → kullanıcı, kassa sayı → POS kasa; birim fiyatlar
   * config'teki defaultPrices'tan gelir (leads akışıyla aynı).
   */
  async convertToQuote(id: string): Promise<Quote> {
    const record = await this.findOne(id);
    if (record.quoteId) throw new BadRequestException('Bu kayıt zaten teklife dönüştürülmüş');

    const prices = this.config.get<{ user: string; pos: string; mobile: string }>('defaultPrices')!;

    const hw: string[] = [];
    if (record.branchCount != null) hw.push(`filial=${record.branchCount}`);
    if (record.cashRegisterCount != null) hw.push(`kassa=${record.cashRegisterCount}`);
    if (record.barcodeScannerCount != null) hw.push(`barkod=${record.barcodeScannerCount}`);
    if (record.scaleCount != null) hw.push(`tərəzi=${record.scaleCount}`);
    if (record.posTerminalCount != null) hw.push(`POS=${record.posTerminalCount}`);
    if (record.computerCount != null) hw.push(`kompüter=${record.computerCount}`);

    const quote = await this.quotesService.create({
      customerName: record.companyLegalName || record.marketName || record.fullName,
      contactEmail: record.email,
      seats: record.computerCount ?? 5,
      posTerminals: record.cashRegisterCount ?? 1,
      mobileTerminals: 0,
      pricePerUser: prices.user,
      pricePerPosTerminal: prices.pos,
      pricePerMobileTerminal: prices.mobile,
      currency: 'AZN',
      notes:
        `Müşteri bilgi formu (${record.fullName}, ${record.phone})` +
        (record.mainActivity ? ` — ${record.mainActivity}` : '') +
        (hw.length ? ` — ${hw.join(', ')}` : '') +
        (record.note ? `\n${record.note}` : ''),
    });

    record.quoteId = quote.id;
    if (record.status === ClientInfoStatus.NEW) record.status = ClientInfoStatus.CONTACTED;
    await this.repo.save(record);
    return quote;
  }
}
