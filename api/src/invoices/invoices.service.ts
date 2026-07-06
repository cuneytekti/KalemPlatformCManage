import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceLine, InvoiceStatus } from '../entities/invoice.entity';
import { License, LicenseStatus } from '../entities/license.entity';
import { Tenant, TenantStatus } from '../entities/tenant.entity';
import { MailService } from '../mail/mail.service';
import { DockerService } from '../provisioning/docker.service';
import { InvoiceLang, InvoicePdfService } from './invoice-pdf.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(License) private readonly licenses: Repository<License>,
    private readonly pdfService: InvoicePdfService,
    private readonly mail: MailService,
    private readonly docker: DockerService,
    private readonly config: ConfigService,
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
      // Pro-rata: lisans bu dönemin ortasında başladıysa kalan gün oranı uygulanır
      const [year, month] = period.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      let ratio = 1;
      if (license.validFrom?.startsWith(period)) {
        const startDay = parseInt(license.validFrom.slice(8, 10), 10);
        ratio = (daysInMonth - startDay + 1) / daysInMonth;
      }
      const prorated = ratio < 1;
      const lineOf = (label: string, qty: number, unit: string): InvoiceLine => ({
        label: prorated ? `${label} (pro-rata ${Math.round(ratio * 100)}%)` : label,
        qty,
        unitPrice: parseFloat(unit).toFixed(2),
        total: ((Math.round(qty * cents(unit) * ratio)) / 100).toFixed(2),
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

  async findOneWithTenant(id: string): Promise<{ invoice: Invoice; tenant: Tenant }> {
    const invoice = await this.invoices.findOneBy({ id });
    if (!invoice) throw new NotFoundException('Fatura bulunamadı');
    const tenant = await this.tenants.findOneBy({ id: invoice.tenantId });
    if (!tenant) throw new NotFoundException('Faturanın müşterisi bulunamadı');
    return { invoice, tenant };
  }

  async renderPdf(id: string, lang: InvoiceLang): Promise<{ pdf: Buffer; invoice: Invoice; tenant: Tenant }> {
    const { invoice, tenant } = await this.findOneWithTenant(id);
    const pdf = await this.pdfService.renderPdf(invoice, tenant, lang);
    return { pdf, invoice, tenant };
  }

  /** Fatura PDF'ini müşteriye e-postayla gönderir ve SENT işaretler. */
  async sendByEmail(id: string, lang: InvoiceLang): Promise<Invoice> {
    const { pdf, invoice, tenant } = await this.renderPdf(id, lang);
    if (!tenant.contactEmail) throw new BadRequestException('Müşterinin e-posta adresi yok');
    if (!this.mail.enabled) throw new BadRequestException('SMTP yapılandırılmamış (SMTP_HOST)');
    const sent = await this.mail.send(
      tenant.contactEmail,
      `Kalem Platform — Fatura ${invoice.period} (${tenant.name})`,
      `${invoice.period} dönemi faturanız ektedir. Son ödeme tarihi: ${invoice.dueDate ?? '-'}.

Kalem Yazılım · 012 526 22 22 · info@kalemyazilim.az`,
      [{ filename: `kalem-fatura-${invoice.period}.pdf`, content: pdf, contentType: 'application/pdf' }],
    );
    if (!sent) throw new BadRequestException('E-posta gönderilemedi');
    if (invoice.status === InvoiceStatus.DRAFT) {
      invoice.status = InvoiceStatus.SENT;
      return this.invoices.save(invoice);
    }
    return invoice;
  }

  /**
   * OVERDUE faturası N günden eski olan ACTIVE tenant'ları askıya alır
   * (AUTO_SUSPEND_OVERDUE_DAYS > 0 ise; günlük 07:30 Bakü).
   */
  @Cron('30 7 * * *', { timeZone: 'Asia/Baku' })
  async autoSuspendOverdue(): Promise<void> {
    const days = this.config.get<number>('autoSuspendOverdueDays')!;
    if (!days || days <= 0) return;
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    const overdue = await this.invoices
      .createQueryBuilder('i')
      .where('i.status = :st AND i."dueDate" < :cutoff', { st: InvoiceStatus.OVERDUE, cutoff })
      .getMany();
    for (const invoice of overdue) {
      const tenant = await this.tenants.findOneBy({ id: invoice.tenantId, status: TenantStatus.ACTIVE });
      if (!tenant) continue;
      this.logger.warn(`Oto-suspend: ${tenant.slug} (${invoice.period} faturası ${days}+ gün gecikmiş)`);
      await this.docker.stopTenantStack(tenant.slug);
      await this.tenants.update(tenant.id, { status: TenantStatus.SUSPENDED });
      void this.mail.send(
        this.config.get<string>('admin.email')!,
        `Oto-suspend: ${tenant.name}`,
        `${tenant.slug} tenant'ı, ${invoice.period} faturası ${days} günden uzun süredir gecikmiş olduğu için otomatik askıya alındı.`,
      );
    }
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
