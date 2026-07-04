import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Quote, QuoteStatus } from '../entities/quote.entity';

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
  constructor(@InjectRepository(Quote) private readonly quotes: Repository<Quote>) {}

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

  // TODO (Faz 3): Playwright ile az/tr/en HTML→PDF teklif çıktısı
}
