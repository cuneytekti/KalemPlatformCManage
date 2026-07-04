import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceLine, InvoiceStatus } from '../entities/invoice.entity';
import { License, LicenseStatus } from '../entities/license.entity';
import { Tenant, TenantStatus } from '../entities/tenant.entity';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(License) private readonly licenses: Repository<License>,
  ) {}

  findAll(): Promise<Invoice[]> {
    return this.invoices.find({ order: { period: 'DESC', createdAt: 'DESC' } });
  }

  /** Her ayın 1'i 06:00 Bakü — geçen ay değil, içinde bulunulan dönem faturalanır. */
  @Cron('0 6 1 * *', { timeZone: 'Asia/Baku' })
  async generateMonthly(): Promise<void> {
    const period = new Date().toISOString().slice(0, 7);
    const created = await this.generateForPeriod(period);
    this.logger.log(`${period} dönemi: ${created.length} fatura oluşturuldu`);
  }

  /**
   * Dönem faturaları: ACTIVE tenant × en güncel ACTIVE lisans.
   * Aynı tenant+dönem için mükerrer fatura oluşturulmaz (idempotent).
   * TODO (Faz 5 devamı): dönem ortası lisans değişikliğinde pro-rata hesap.
   */
  async generateForPeriod(period: string): Promise<Invoice[]> {
    if (!/^\d{4}-\d{2}$/.test(period)) throw new NotFoundException('Dönem formatı YYYY-MM olmalı');
    const activeTenants = await this.tenants.findBy({ status: TenantStatus.ACTIVE });
    const created: Invoice[] = [];

    for (const tenant of activeTenants) {
      const existing = await this.invoices.findOneBy({ tenantId: tenant.id, period });
      if (existing) continue;

      const license = await this.licenses.findOne({
        where: { tenantId: tenant.id, status: LicenseStatus.ACTIVE },
        order: { createdAt: 'DESC' },
      });
      if (!license) {
        this.logger.warn(`${tenant.slug}: ACTIVE lisans yok, fatura atlandı`);
        continue;
      }

      const cents = (v: string) => Math.round(parseFloat(v) * 100);
      const lineOf = (label: string, qty: number, unit: string): InvoiceLine => ({
        label, qty, unitPrice: parseFloat(unit).toFixed(2),
        total: ((qty * cents(unit)) / 100).toFixed(2),
      });
      const lines = [
        lineOf('Kullanıcı lisansı', license.seats, license.pricePerUser),
        lineOf('POS kasa', license.posTerminals, license.pricePerPosTerminal),
        ...(license.mobileTerminals > 0
          ? [lineOf('Mobil terminal', license.mobileTerminals, license.pricePerMobileTerminal)]
          : []),
      ];
      const total = (lines.reduce((s, l) => s + cents(l.total), 0) / 100).toFixed(2);
      const dueDate = `${period}-15`;

      created.push(
        await this.invoices.save(
          this.invoices.create({
            tenantId: tenant.id, period, lines, total,
            currency: license.currency, status: InvoiceStatus.DRAFT, dueDate,
          }),
        ),
      );
    }
    return created;
  }

  async setStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    const invoice = await this.invoices.findOneBy({ id });
    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    invoice.status = status;
    return this.invoices.save(invoice);
  }

  /** Vadesi geçmiş SENT faturaları OVERDUE işaretler (günlük 07:00). */
  @Cron('0 7 * * *', { timeZone: 'Asia/Baku' })
  async markOverdue(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    await this.invoices
      .createQueryBuilder()
      .update()
      .set({ status: InvoiceStatus.OVERDUE })
      .where('status = :sent AND "dueDate" < :today', { sent: InvoiceStatus.SENT, today })
      .execute();
  }
}
