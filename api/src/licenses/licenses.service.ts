import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { License, LicenseStatus } from '../entities/license.entity';
import { InvoicesService } from '../invoices/invoices.service';

export interface ChangeDimensionsInput {
  seats: number;
  posTerminals: number;
  mobileTerminals: number;
  pricePerUser?: string;
  pricePerPosTerminal?: string;
  pricePerMobileTerminal?: string;
}

@Injectable()
export class LicensesService {
  constructor(
    @InjectRepository(License) private readonly licenses: Repository<License>,
    private readonly invoices: InvoicesService,
  ) {}

  findAll(): Promise<License[]> {
    return this.licenses.find({ order: { createdAt: 'DESC' } });
  }

  findForTenant(tenantId: string): Promise<License[]> {
    return this.licenses.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  create(data: Partial<License>): Promise<License> {
    return this.licenses.save(this.licenses.create(data));
  }

  /**
   * Lisans boyut/fiyat değişikliği — geçmiş korunur:
   * eski satır bugünle kapatılır (EXPIRED), yeni ACTIVE satır bugünden başlar.
   * İçinde bulunulan dönemin DRAFT faturası pro-rata ile yeniden hesaplanır.
   */
  async change(id: string, input: ChangeDimensionsInput): Promise<License> {
    const current = await this.licenses.findOneBy({ id });
    if (!current) throw new NotFoundException('Lisans bulunamadı');
    if (current.status !== LicenseStatus.ACTIVE) {
      throw new BadRequestException('Yalnız ACTIVE lisans değiştirilebilir');
    }

    const today = new Date().toISOString().slice(0, 10);
    const next = this.licenses.create({
      tenantId: current.tenantId,
      seats: input.seats,
      posTerminals: input.posTerminals,
      mobileTerminals: input.mobileTerminals,
      pricePerUser: input.pricePerUser ?? current.pricePerUser,
      pricePerPosTerminal: input.pricePerPosTerminal ?? current.pricePerPosTerminal,
      pricePerMobileTerminal: input.pricePerMobileTerminal ?? current.pricePerMobileTerminal,
      currency: current.currency,
      validFrom: today,
      validUntil: current.validUntil,
      status: LicenseStatus.ACTIVE,
    });

    const noChange =
      current.seats === next.seats &&
      current.posTerminals === next.posTerminals &&
      current.mobileTerminals === next.mobileTerminals &&
      current.pricePerUser === next.pricePerUser &&
      current.pricePerPosTerminal === next.pricePerPosTerminal &&
      current.pricePerMobileTerminal === next.pricePerMobileTerminal;
    if (noChange) return current;

    current.validUntil = today;
    current.status = LicenseStatus.EXPIRED;
    await this.licenses.save(current);
    const saved = await this.licenses.save(next);

    // Dönem ortası değişiklik: bu dönemin DRAFT faturası varsa pro-rata yeniden hesap
    await this.invoices.recalculateDraft(current.tenantId, today.slice(0, 7));
    return saved;
  }

  /** @deprecated Geçmişi korumak için change() kullanın; bu uç ona delege eder. */
  async updateSeats(id: string, seats: number): Promise<License> {
    const current = await this.licenses.findOneBy({ id });
    if (!current) throw new NotFoundException('Lisans bulunamadı');
    return this.change(id, {
      seats,
      posTerminals: current.posTerminals,
      mobileTerminals: current.mobileTerminals,
    });
  }

  async cancel(id: string): Promise<License> {
    const license = await this.licenses.findOneBy({ id });
    if (!license) throw new NotFoundException('Lisans bulunamadı');
    license.status = LicenseStatus.CANCELLED;
    return this.licenses.save(license);
  }
}
