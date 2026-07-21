import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { LogoKalemCatalogItem } from '../entities/logo-kalem-catalog-item.entity';
import { LogoKalemQuoteActivity } from '../entities/logo-kalem-quote-activity.entity';
import { LogoKalemQuoteAdjustment } from '../entities/logo-kalem-quote-adjustment.entity';
import { LogoKalemQuoteLine } from '../entities/logo-kalem-quote-line.entity';
import { LogoKalemQuoteRevision } from '../entities/logo-kalem-quote-revision.entity';
import { LogoKalemQuoteSection } from '../entities/logo-kalem-quote-section.entity';
import { LogoKalemQuote } from '../entities/logo-kalem-quote.entity';
import { QuoteActivityType } from '../entities/quote-activity.entity';
import { QuoteStatus } from '../entities/quote.entity';
import { MailService } from '../mail/mail.service';
import { KALEM_EMAIL_LOGO_BASE64 } from '../quotes/quote-email-logo';
import { LogoKalemActivityDto, LogoKalemCatalogDto, LogoKalemSectionDto, SaveLogoKalemQuoteDto } from './logo-kalem.dto';
import { LogoKalemPdfService } from './logo-kalem-pdf.service';

export type LogoKalemLineDetail = LogoKalemQuoteLine & { catalogCode?: string };

export type LogoKalemDetail = {
  quote: LogoKalemQuote;
  revision: LogoKalemQuoteRevision;
  sections: Array<LogoKalemQuoteSection & { lines: LogoKalemLineDetail[] }>;
  adjustments: LogoKalemQuoteAdjustment[];
};

@Injectable()
export class LogoKalemService {
  constructor(
    @InjectRepository(LogoKalemQuote) private readonly quotes: Repository<LogoKalemQuote>,
    @InjectRepository(LogoKalemQuoteRevision) private readonly revisions: Repository<LogoKalemQuoteRevision>,
    @InjectRepository(LogoKalemQuoteSection) private readonly sections: Repository<LogoKalemQuoteSection>,
    @InjectRepository(LogoKalemQuoteLine) private readonly lines: Repository<LogoKalemQuoteLine>,
    @InjectRepository(LogoKalemQuoteAdjustment) private readonly adjustments: Repository<LogoKalemQuoteAdjustment>,
    @InjectRepository(LogoKalemQuoteActivity) private readonly activities: Repository<LogoKalemQuoteActivity>,
    @InjectRepository(LogoKalemCatalogItem) private readonly catalog: Repository<LogoKalemCatalogItem>,
    private readonly dataSource: DataSource,
    private readonly pdf: LogoKalemPdfService,
    private readonly mail: MailService,
  ) {}

  async list(): Promise<Array<LogoKalemQuote & { activeRevision?: LogoKalemQuoteRevision; lastActivity?: LogoKalemQuoteActivity }>> {
    const quotes = await this.quotes.find({ order: { createdAt: 'DESC' } });
    const revisionIds = quotes.map((q) => q.activeRevisionId).filter(Boolean) as string[];
    const revisions = revisionIds.length ? await this.revisions.findBy({ id: In(revisionIds) }) : [];
    const acts = quotes.length ? await this.activities.find({ where: { quoteId: In(quotes.map((q) => q.id)) }, order: { activityAt: 'DESC' } }) : [];
    const revMap = new Map(revisions.map((r) => [r.id, r]));
    const actMap = new Map<string, LogoKalemQuoteActivity>();
    acts.forEach((a) => { if (!actMap.has(a.quoteId)) actMap.set(a.quoteId, a); });
    return quotes.map((q) => Object.assign(q, { activeRevision: q.activeRevisionId ? revMap.get(q.activeRevisionId) : undefined, lastActivity: actMap.get(q.id) }));
  }

  async detail(id: string, revisionId?: string): Promise<LogoKalemDetail> {
    const quote = await this.quotes.findOneBy({ id });
    if (!quote) throw new NotFoundException('Logo-Kalem teklifi bulunamadı');
    const rid = revisionId ?? quote.activeRevisionId;
    if (!rid) throw new NotFoundException('Teklif revizyonu bulunamadı');
    const revision = await this.revisions.findOneBy({ id: rid, quoteId: id });
    if (!revision) throw new NotFoundException('Teklif revizyonu bulunamadı');
    const sections = await this.sections.find({ where: { revisionId: rid }, order: { sortOrder: 'ASC' } });
    const lines = sections.length ? await this.lines.find({ where: { sectionId: In(sections.map((s) => s.id)) }, order: { sortOrder: 'ASC' } }) : [];
    const catalogIds = [...new Set(lines.map((line) => line.catalogItemId).filter(Boolean) as string[])];
    const catalogRows = catalogIds.length ? await this.catalog.findBy({ id: In(catalogIds) }) : [];
    const catalogCodeMap = new Map(catalogRows.map((item) => [item.id, item.code]));
    const lineMap = new Map<string, LogoKalemLineDetail[]>();
    lines.forEach((line) => {
      const enriched = Object.assign(line, { catalogCode: line.catalogItemId ? catalogCodeMap.get(line.catalogItemId) : undefined });
      lineMap.set(line.sectionId, [...(lineMap.get(line.sectionId) ?? []), enriched]);
    });
    const adjustmentRows = await this.adjustments.find({ where: { revisionId: rid }, order: { sortOrder: 'ASC' } });
    return { quote, revision, sections: sections.map((s) => Object.assign(s, { lines: lineMap.get(s.id) ?? [] })), adjustments: adjustmentRows };
  }

  async listRevisions(id: string): Promise<LogoKalemQuoteRevision[]> {
    await this.ensureQuote(id);
    return this.revisions.find({ where: { quoteId: id }, order: { revisionNumber: 'DESC' } });
  }

  async create(input: SaveLogoKalemQuoteDto): Promise<LogoKalemDetail> {
    const id = randomUUID();
    const baseNumber = `LK-${new Date().getFullYear()}-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    await this.dataSource.transaction(async (manager) => {
      const quote = manager.getRepository(LogoKalemQuote).create({ id, baseNumber, customerName: input.customerName, contactName: input.contactName, contactEmail: input.contactEmail, contactPhone: input.contactPhone, status: QuoteStatus.DRAFT });
      await manager.getRepository(LogoKalemQuote).save(quote);
      const revision = await this.saveRevision(manager, quote, input, 0);
      quote.activeRevisionId = revision.id;
      await manager.getRepository(LogoKalemQuote).save(quote);
    });
    return this.detail(id);
  }

  async update(id: string, input: SaveLogoKalemQuoteDto): Promise<LogoKalemDetail> {
    const detail = await this.detail(id);
    if (detail.revision.lockedAt) throw new BadRequestException('Gönderilmiş revizyon değiştirilemez; yeni revizyon oluşturun');
    await this.dataSource.transaction(async (manager) => {
      Object.assign(detail.quote, { customerName: input.customerName, contactName: input.contactName, contactEmail: input.contactEmail, contactPhone: input.contactPhone });
      await manager.getRepository(LogoKalemQuote).save(detail.quote);
      await manager.getRepository(LogoKalemQuoteLine).delete({ sectionId: In(detail.sections.map((s) => s.id)) });
      await manager.getRepository(LogoKalemQuoteSection).delete({ revisionId: detail.revision.id });
      await manager.getRepository(LogoKalemQuoteAdjustment).delete({ revisionId: detail.revision.id });
      await this.applyRevision(manager, detail.revision, input);
    });
    return this.detail(id);
  }

  async newRevision(id: string, actor?: string): Promise<LogoKalemDetail> {
    const current = await this.detail(id);
    if (!current.revision.lockedAt) throw new BadRequestException('Yalnız gönderilmiş bir teklif için yeni revizyon açılabilir');
    const input = this.toInput(current);
    await this.dataSource.transaction(async (manager) => {
      const revision = await this.saveRevision(manager, current.quote, input, current.revision.revisionNumber + 1);
      current.quote.activeRevisionId = revision.id;
      current.quote.status = QuoteStatus.DRAFT;
      await manager.getRepository(LogoKalemQuote).save(current.quote);
      await manager.getRepository(LogoKalemQuoteActivity).save(manager.getRepository(LogoKalemQuoteActivity).create({ quoteId: id, type: QuoteActivityType.STATUS_CHANGE, status: QuoteStatus.DRAFT, note: `R${String(revision.revisionNumber).padStart(2, '0')} revizyonu oluşturuldu.`, activityAt: new Date(), createdByEmail: actor }));
    });
    return this.detail(id);
  }

  async renderPdf(id: string, revisionId?: string): Promise<{ pdf: Buffer; filename: string }> {
    const detail = await this.detail(id, revisionId);
    if (detail.revision.lockedAt) {
      const stored = await this.revisions.createQueryBuilder('r').addSelect(['r.pdfSnapshot', 'r.pdfSha256']).where('r.id = :id', { id: detail.revision.id }).getOne();
      if (stored?.pdfSnapshot) {
        const digest = createHash('sha256').update(stored.pdfSnapshot).digest('hex');
        if (!stored.pdfSha256 || digest !== stored.pdfSha256) throw new BadRequestException('Gönderilmiş PDF snapshot bütünlüğü doğrulanamadı');
        return { pdf: stored.pdfSnapshot, filename: this.filename(detail) };
      }
    }
    return { pdf: await this.pdf.render(detail), filename: this.filename(detail) };
  }

  async send(id: string, actor?: string): Promise<LogoKalemDetail> {
    const detail = await this.detail(id);
    if (detail.revision.lockedAt) throw new BadRequestException('Bu revizyon daha önce gönderilmiş');
    if (!detail.quote.contactEmail) throw new BadRequestException('Alıcı e-posta adresi zorunludur');
    if (!this.mail.enabled) throw new BadRequestException('SMTP yapılandırılmamış');
    const pdf = await this.pdf.render(detail);
    const mail = this.pdf.email(detail);
    const sent = await this.mail.send(detail.quote.contactEmail, mail.subject, mail.text, [
      { filename: this.filename(detail), content: pdf, contentType: 'application/pdf' },
      { filename: 'kalem-logo.png', content: Buffer.from(KALEM_EMAIL_LOGO_BASE64, 'base64'), contentType: 'image/png', cid: 'kalem-logo', contentDisposition: 'inline' },
    ], mail.html);
    if (!sent) throw new BadRequestException('E-posta gönderilemedi');
    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      detail.revision.lockedAt = now;
      detail.revision.pdfSnapshot = pdf;
      detail.revision.pdfSha256 = createHash('sha256').update(pdf).digest('hex');
      await manager.getRepository(LogoKalemQuoteRevision).save(detail.revision);
      detail.quote.status = QuoteStatus.SENT; detail.quote.sentAt = now;
      await manager.getRepository(LogoKalemQuote).save(detail.quote);
      await manager.getRepository(LogoKalemQuoteActivity).save(manager.getRepository(LogoKalemQuoteActivity).create({ quoteId: id, type: QuoteActivityType.EMAIL_SENT, status: QuoteStatus.SENT, note: `${this.displayNumber(detail)} ${detail.quote.contactEmail} adresine gönderildi.`, activityAt: now, createdByEmail: actor }));
    });
    return this.detail(id);
  }

  async getActivities(id: string): Promise<LogoKalemQuoteActivity[]> {
    await this.ensureQuote(id);
    return this.activities.find({ where: { quoteId: id }, order: { activityAt: 'DESC', createdAt: 'DESC' } });
  }

  async addActivity(id: string, input: LogoKalemActivityDto, actor?: string): Promise<LogoKalemQuoteActivity> {
    const quote = await this.ensureQuote(id);
    const note = input.note.trim();
    if (!note) throw new BadRequestException('Süreç notu zorunludur');
    const status = input.status ?? this.statusFor(input.type, quote.status);
    return this.dataSource.transaction(async (manager) => {
      quote.status = status;
      await manager.getRepository(LogoKalemQuote).save(quote);
      return manager.getRepository(LogoKalemQuoteActivity).save(manager.getRepository(LogoKalemQuoteActivity).create({ quoteId: id, type: input.type, status, note, activityAt: input.activityAt ? new Date(input.activityAt) : new Date(), createdByEmail: actor }));
    });
  }

  listCatalog(): Promise<LogoKalemCatalogItem[]> { return this.catalog.find({ order: { sortOrder: 'ASC', nameTr: 'ASC' } }); }
  createCatalog(input: LogoKalemCatalogDto): Promise<LogoKalemCatalogItem> { return this.catalog.save(this.catalog.create({ ...input, active: input.active ?? true, unit: input.unit ?? 'Adet', billingPeriod: input.billingPeriod ?? 'ONE_TIME' })); }
  async updateCatalog(id: string, input: LogoKalemCatalogDto): Promise<LogoKalemCatalogItem> { const item = await this.catalog.findOneBy({ id }); if (!item) throw new NotFoundException('Katalog ürünü bulunamadı'); Object.assign(item, input); return this.catalog.save(item); }

  private async ensureQuote(id: string): Promise<LogoKalemQuote> { const quote = await this.quotes.findOneBy({ id }); if (!quote) throw new NotFoundException('Logo-Kalem teklifi bulunamadı'); return quote; }
  private async saveRevision(manager: any, quote: LogoKalemQuote, input: SaveLogoKalemQuoteDto, revisionNumber: number) { const revision = manager.getRepository(LogoKalemQuoteRevision).create({ id: randomUUID(), quoteId: quote.id, revisionNumber }); return this.applyRevision(manager, revision, input); }
  private async applyRevision(manager: any, revision: LogoKalemQuoteRevision, input: SaveLogoKalemQuoteDto) {
    Object.assign(revision, { language: input.language, projectTitle: input.projectTitle, subject: input.subject, meetingDate: input.meetingDate, quoteDate: input.quoteDate, senderName: input.senderName, senderPhone: input.senderPhone, senderEmail: input.senderEmail, introduction: input.introduction, projectScope: input.projectScope, projectTeam: input.projectTeam, projectDuration: input.projectDuration, paymentTerms: input.paymentTerms, validityTerms: input.validityTerms, deliveryTerms: input.deliveryTerms, travelTerms: input.travelTerms, notes: input.notes, includeReferences: input.includeReferences ?? true, includeCertificates: input.includeCertificates ?? true, lockedAt: undefined, pdfSnapshot: undefined, pdfSha256: undefined });
    await manager.getRepository(LogoKalemQuoteRevision).save(revision);
    const catalogIds = [...new Set(input.sections.flatMap((section) => section.lines.map((line) => line.catalogItemId).filter(Boolean)))] as string[];
    const catalogRows: LogoKalemCatalogItem[] = catalogIds.length ? await manager.getRepository(LogoKalemCatalogItem).findBy({ id: In(catalogIds) }) : [];
    const catalogCodeMap = new Map(catalogRows.map((item) => [item.id, item.code.trim().toUpperCase()]));
    const percentLines = input.sections.flatMap((section) => section.lines.map((line) => ({ section, line }))).filter(({ line }) => line.pricingMode === 'LICENSE_PERCENT');
    if (percentLines.length > 1) throw new BadRequestException('Teklifte yalnız bir yüzdesel LEM paketi bulunabilir');
    const licenseBase = this.calculateLicenseBase(input.sections);
    const mainCurrencies = new Set(input.sections.filter((section) => section.type === 'MAIN' && section.lines.length).map((section) => section.currency));
    if (percentLines.length) {
      const [{ section, line }] = percentLines;
      const code = line.catalogItemId ? catalogCodeMap.get(line.catalogItemId) : undefined;
      if (section.type !== 'LEM' || !code?.startsWith('LEM')) throw new BadRequestException('Yüzdesel LEM yalnız LEM kodlu katalog ürünü ve LEM bölümünde kullanılabilir');
      if (licenseBase <= 0) throw new BadRequestException('Yıllık LEM hesabı için en az bir lisans satırı gereklidir');
      if (mainCurrencies.size !== 1 || !mainCurrencies.has(section.currency)) throw new BadRequestException('LEM para birimi lisans bölümüyle aynı olmalıdır');
    }
    const totals: Record<string, number> = { MAIN: 0, SERVICE: 0, MAINTENANCE: 0, LEM: 0 };
    for (const [sIndex, sectionInput] of input.sections.entries()) {
      const section = manager.getRepository(LogoKalemQuoteSection).create({ revisionId: revision.id, type: sectionInput.type, title: sectionInput.title, currency: sectionInput.currency, billingPeriod: sectionInput.billingPeriod ?? 'ONE_TIME', sortOrder: sectionInput.sortOrder ?? sIndex });
      const calculated = sectionInput.lines.map((line, index) => line.pricingMode === 'LICENSE_PERCENT'
        ? this.calculateLicensePercentLine({ ...line, currency: line.currency ?? sectionInput.currency }, index, licenseBase)
        : this.calculateLine({ ...line, currency: line.currency ?? sectionInput.currency }, index));
      if (calculated.some((line) => line.currency !== sectionInput.currency)) throw new BadRequestException('Bir bölümdeki tüm satırlar aynı para biriminde olmalıdır');
      section.subtotal = this.money(calculated.reduce((sum, line) => sum + Number(line.grossTotal), 0));
      section.discountTotal = this.money(calculated.reduce((sum, line) => sum + Number(line.discountTotal), 0));
      section.netTotal = this.money(calculated.reduce((sum, line) => sum + Number(line.netTotal), 0));
      await manager.getRepository(LogoKalemQuoteSection).save(section);
      for (const line of calculated) await manager.getRepository(LogoKalemQuoteLine).save(manager.getRepository(LogoKalemQuoteLine).create({ ...line, sectionId: section.id }));
      totals[section.type] += Number(section.netTotal);
    }
    const targetTotals = { MAIN: totals.MAIN + totals.SERVICE, MAINTENANCE: totals.MAINTENANCE, LEM: totals.LEM };
    let taxTotal = 0;
    for (const [index, item] of input.adjustments.entries()) {
      if (percentLines.length && item.target === 'LEM' && item.type === 'DISCOUNT') throw new BadRequestException('Yüzdesel LEM paketine ek indirim uygulanamaz');
      const base = targetTotals[item.target]; const raw = item.method === 'PERCENT' ? base * Number(item.value) / 100 : Number(item.value); const amount = Math.round(raw * 100) / 100;
      if (Number(item.value) < 0 || (item.method === 'PERCENT' && Number(item.value) > 100)) throw new BadRequestException('Yüzde değerleri 0–100 aralığında olmalıdır');
      if (item.type === 'DISCOUNT' && amount > base) throw new BadRequestException('Sabit indirim ilgili toplamı aşamaz');
      if (item.type === 'TAX') taxTotal += amount; else targetTotals[item.target] += item.type === 'DISCOUNT' ? -amount : amount;
      await manager.getRepository(LogoKalemQuoteAdjustment).save(manager.getRepository(LogoKalemQuoteAdjustment).create({ revisionId: revision.id, ...item, amount: this.money(amount), sortOrder: item.sortOrder ?? index }));
    }
    revision.mainTotal = this.money(targetTotals.MAIN); revision.maintenanceTotal = this.money(targetTotals.MAINTENANCE); revision.lemTotal = this.money(targetTotals.LEM); revision.taxTotal = this.money(taxTotal);
    return manager.getRepository(LogoKalemQuoteRevision).save(revision);
  }
  private calculateLine(line: any, index: number) { const gross = Math.round(Number(line.quantity) * Number(line.unitPrice) * 100) / 100; const discountValue = Number(line.discountValue ?? 0); if (discountValue < 0 || (line.discountType === 'PERCENT' && discountValue > 100)) throw new BadRequestException('Satır indirim yüzdesi 0–100 aralığında olmalıdır'); let discount = 0; if (line.discountType === 'PERCENT') discount = gross * discountValue / 100; if (line.discountType === 'FIXED') discount = discountValue; discount = Math.min(gross, Math.max(0, Math.round(discount * 100) / 100)); return { ...line, pricingMode: 'STANDARD', ratePercent: undefined, calculationBase: '0.00', unit: line.unit ?? 'Adet', currency: line.currency ?? 'USD', discountType: line.discountType ?? 'NONE', discountValue: line.discountValue ?? '0', grossTotal: this.money(gross), discountTotal: this.money(discount), netTotal: this.money(gross - discount), sortOrder: line.sortOrder ?? index }; }
  private calculateLicenseBase(sections: LogoKalemSectionDto[]) { const value = sections.filter((section) => section.type === 'MAIN').flatMap((section) => section.lines).reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0); return Math.round(value * 100) / 100; }
  private calculateLicensePercentLine(line: any, index: number, licenseBase: number) { const rate = Number(line.ratePercent); if (!Number.isFinite(rate) || rate <= 0 || rate > 100) throw new BadRequestException('Yıllık LEM oranı 0’dan büyük ve en fazla 100 olmalıdır'); if ((line.discountType ?? 'NONE') !== 'NONE' || Number(line.discountValue ?? 0) !== 0) throw new BadRequestException('Yüzdesel LEM satırına indirim uygulanamaz'); const annual = Math.round(licenseBase * rate) / 100; return { ...line, pricingMode: 'LICENSE_PERCENT', ratePercent: rate.toFixed(2), calculationBase: this.money(licenseBase), quantity: '1', unitPrice: this.money(annual), unit: line.unit ?? 'Yıl', currency: line.currency ?? 'USD', discountType: 'NONE', discountValue: '0', grossTotal: this.money(annual), discountTotal: '0.00', netTotal: this.money(annual), sortOrder: line.sortOrder ?? index }; }
  private money(value: number) { if (!Number.isFinite(value) || value < 0) throw new BadRequestException('Fiyat değerleri sıfır veya pozitif olmalıdır'); return value.toFixed(2); }
  private statusFor(type: QuoteActivityType, current: QuoteStatus) { if (type === QuoteActivityType.PHONE_CALL || type === QuoteActivityType.VISIT) return QuoteStatus.FOLLOW_UP; if (type === QuoteActivityType.MEETING) return QuoteStatus.MEETING; return current; }
  private displayNumber(d: LogoKalemDetail) { return `${d.quote.baseNumber}-R${String(d.revision.revisionNumber).padStart(2, '0')}`; }
  private filename(d: LogoKalemDetail) { return `${this.displayNumber(d)}-${d.revision.language}.pdf`; }
  private toInput(d: LogoKalemDetail): SaveLogoKalemQuoteDto { return { customerName: d.quote.customerName, contactName: d.quote.contactName, contactEmail: d.quote.contactEmail, contactPhone: d.quote.contactPhone, language: d.revision.language, projectTitle: d.revision.projectTitle, subject: d.revision.subject, meetingDate: d.revision.meetingDate, quoteDate: d.revision.quoteDate, senderName: d.revision.senderName, senderPhone: d.revision.senderPhone, senderEmail: d.revision.senderEmail, introduction: d.revision.introduction, projectScope: d.revision.projectScope, projectTeam: d.revision.projectTeam, projectDuration: d.revision.projectDuration, paymentTerms: d.revision.paymentTerms, validityTerms: d.revision.validityTerms, deliveryTerms: d.revision.deliveryTerms, travelTerms: d.revision.travelTerms, notes: d.revision.notes, includeReferences: d.revision.includeReferences, includeCertificates: d.revision.includeCertificates, sections: d.sections.map((s) => ({ type: s.type, title: s.title, currency: s.currency, billingPeriod: s.billingPeriod, sortOrder: s.sortOrder, lines: s.lines.map((l) => ({ catalogItemId: l.catalogItemId, name: l.name, description: l.description, location: l.location, unit: l.unit, currency: l.currency, userCount: l.userCount, quantity: l.quantity, unitPrice: l.unitPrice, pricingMode: l.pricingMode, ratePercent: l.ratePercent, discountType: l.discountType, discountValue: l.discountValue, sortOrder: l.sortOrder })) })), adjustments: d.adjustments.map((a) => ({ target: a.target, type: a.type, label: a.label, method: a.method, value: a.value, sortOrder: a.sortOrder })) }; }
}
