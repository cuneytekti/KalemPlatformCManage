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

const DAY_MS = 86_400_000;

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
   * Dönem faturaları: ACTIVE tenant × dönemle kesişen lisans geçmişi.
   * Aynı tenant+dönem için mükerrer fatura oluşturulmaz (idempotent).
   * Dönem ortası lisans değişikliği segment bazlı pro-rata ile hesaplanır.
   */
  async generateForPeriod(period: string): Promise<Invoice[]> {
    if (!/^\d{4}-\d{2}$/.test(period)) throw new NotFoundException('Dönem formatı YYYY-MM olmalı');
    const activeTenants = await this.tenants.findBy({ status: TenantStatus.ACTIVE });
    const created: Invoice[] = [];

    for (const tenant of activeTenants) {
      const existing = await this.invoices.findOneBy({ tenantId: tenant.id, period });
      if (existing) continue;

      const computed = await this.computeForTenant(tenant.id, period);
      if (!computed) {
        this.logger.warn(`${tenant.slug}: dönemle kesişen lisans yok, fatura atlandı`);
        continue;
      }

      created.push(
        await this.invoices.save(
          this.invoices.create({
            tenantId: tenant.id,
            period,
            lines: computed.lines,
            total: computed.total,
            currency: computed.currency,
            status: InvoiceStatus.DRAFT,
            dueDate: `${period}-15`,
          }),
        ),
      );
    }
    return created;
  }

  /**
   * Lisans değişikliği sonrası çağrılır: dönemin DRAFT faturasını
   * segment bazlı pro-rata ile yeniden hesaplar. SENT/PAID faturalara dokunmaz.
   */
  async recalculateDraft(tenantId: string, period: string): Promise<Invoice | null> {
    const invoice = await this.invoices.findOneBy({ tenantId, period });
    if (!invoice || invoice.status !== InvoiceStatus.DRAFT) return null;
    const computed = await this.computeForTenant(tenantId, period);
    if (!computed) return null;
    invoice.lines = computed.lines;
    invoice.total = computed.total;
    invoice.currency = computed.currency;
    this.logger.log(`Fatura yeniden hesaplandı: tenant=${tenantId} dönem=${period} toplam=${computed.total}`);
    return this.invoices.save(invoice);
  }

  /**
   * Dönemle kesişen (CANCELLED olmayan) lisans segmentlerinden fatura kalemleri.
   * Faturalama kuralı: validFrom dahil, validUntil HARİÇ (değişiklik günü yeni
   * lisansa yazılır; çifte faturalama olmaz). Dönemi tam kapsayan tek lisansta
   * oran 1'dir ve etiket eki yazılmaz.
   */
  private async computeForTenant(
    tenantId: string,
    period: string,
  ): Promise<{ lines: InvoiceLine[]; total: string; currency: string } | null> {
    const [year, month] = period.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const periodStart = Date.UTC(year, month - 1, 1);
    const periodEndExclusive = Date.UTC(year, month, 1);

    const overlapping = (
      await this.licenses.find({ where: { tenantId }, order: { validFrom: 'ASC', createdAt: 'ASC' } })
    ).filter((l) => {
      if (l.status === LicenseStatus.CANCELLED) return false;
      const from = Date.parse(l.validFrom);
      const untilEx = l.validUntil ? Date.parse(l.validUntil) : Infinity;
      return from < periodEndExclusive && untilEx > periodStart;
    });
    if (overlapping.length === 0) return null;

    const cents = (v: string) => Math.round(parseFloat(v) * 100);
    const fmt = (d: number) =>
      `${String(new Date(d).getUTCDate()).padStart(2, '0')}.${String(month).padStart(2, '0')}`;
    const lines: InvoiceLine[] = [];

    for (const license of overlapping) {
      const segStart = Math.max(Date.parse(license.validFrom), periodStart);
      const segEndEx = Math.min(
        license.validUntil ? Date.parse(license.validUntil) : periodEndExclusive,
        periodEndExclusive,
      );
      const segDays = Math.round((segEndEx - segStart) / DAY_MS);
      if (segDays <= 0) continue;
      const ratio = segDays / daysInMonth;
      const suffix =
        ratio < 1 ? ` (pro-rata %${Math.round(ratio * 100)} · ${fmt(segStart)}–${fmt(segEndEx - DAY_MS)})` : '';

      const lineOf = (label: string, qty: number, unit: string): InvoiceLine => ({
        label: `${label}${suffix}`,
        qty,
        unitPrice: parseFloat(unit).toFixed(2),
        total: (Math.round(qty * cents(unit) * ratio) / 100).toFixed(2),
      });
      lines.push(lineOf('Kullanıcı lisansı', license.seats, license.pricePerUser));
      lines.push(lineOf('POS kasa', license.posTerminals, license.pricePerPosTerminal));
      if (license.mobileTerminals > 0) {
        lines.push(lineOf('Mobil terminal', license.mobileTerminals, license.pricePerMobileTerminal));
      }
    }
    if (lines.length === 0) return null;

    const total = (lines.reduce((s, l) => s + cents(l.total), 0) / 100).toFixed(2);
    return { lines, total, currency: overlapping[overlapping.length - 1].currency };
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
    const cutoff = new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
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

  /**
   * Vadesi geçmiş SENT faturaları OVERDUE işaretler ve müşteriye gecikme
   * hatırlatması e-postalar (günlük 07:00 Bakü).
   */
  @Cron('0 7 * * *', { timeZone: 'Asia/Baku' })
  async markOverdue(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const lapsed = await this.invoices
      .createQueryBuilder('i')
      .where('i.status = :sent AND i."dueDate" < :today', { sent: InvoiceStatus.SENT, today })
      .getMany();

    for (const invoice of lapsed) {
      invoice.status = InvoiceStatus.OVERDUE;
      await this.invoices.save(invoice);
      const tenant = await this.tenants.findOneBy({ id: invoice.tenantId });
      if (!tenant) continue;
      this.logger.warn(`Gecikmiş fatura: ${tenant.slug} ${invoice.period} (vade ${invoice.dueDate})`);
      if (tenant.contactEmail) {
        void this.mail.send(
          tenant.contactEmail,
          `Kalem Platform — Ödeme hatırlatması (${invoice.period})`,
          `Sayın ${tenant.name},

${invoice.period} dönemine ait ${invoice.total} ${invoice.currency} tutarındaki faturanızın son ödeme tarihi (${invoice.dueDate}) geçmiştir. En kısa sürede ödeme yapmanızı rica ederiz; aksi halde hizmetiniz askıya alınabilir.

Kalem Yazılım · 012 526 22 22 · info@kalemyazilim.az`,
        );
      }
    }
    if (lapsed.length > 0) this.logger.log(`${lapsed.length} fatura OVERDUE işaretlendi`);
  }
}
