import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuoteStatus } from '../entities/quote.entity';
import { SaveLogoKalemQuoteDto } from './logo-kalem.dto';
import { LogoKalemPdfService } from './logo-kalem-pdf.service';
import { LogoKalemService, LogoKalemDetail } from './logo-kalem.service';
import { FixLogoKalemObjectCatalogName1784650600000 } from '../migrations/1784650600000-FixLogoKalemObjectCatalogName';

const detail = (language: 'tr' | 'az' | 'en' = 'tr', attachments = true): LogoKalemDetail => ({
  quote: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', baseNumber: 'LK-2026-AAAAAAAA', customerName: '<Ema & Agro>', contactName: 'Aydın', contactEmail: 'a@example.com', status: QuoteStatus.DRAFT } as never,
  revision: { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', quoteId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', revisionNumber: 0, language, projectTitle: 'ERP Projesi', quoteDate: '2026-07-20', senderName: 'Cüneyt Ekti', includeReferences: attachments, includeCertificates: attachments, mainTotal: '100.00', maintenanceTotal: '20.00', lemTotal: '30.00', taxTotal: '18.00' } as never,
  sections: [
    { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', revisionId: 'b', type: 'MAIN', title: 'Lisanslar', currency: 'USD', billingPeriod: 'ONE_TIME', sortOrder: 0, subtotal: '100.00', discountTotal: '0.00', netTotal: '100.00', lines: [{ name: 'Logo Tiger', unit: 'Adet', currency: 'USD', quantity: '1', unitPrice: '100.00', discountType: 'NONE', discountValue: '0', grossTotal: '100.00', discountTotal: '0.00', netTotal: '100.00' } as never] } as never,
    { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', revisionId: 'b', type: 'SERVICE', title: 'Hizmetler', currency: 'USD', billingPeriod: 'ONE_TIME', sortOrder: 1, subtotal: '0', discountTotal: '0', netTotal: '0', lines: [] } as never,
    { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', revisionId: 'b', type: 'MAINTENANCE', title: 'Bakım', currency: 'USD', billingPeriod: 'MONTHLY', sortOrder: 2, subtotal: '0', discountTotal: '0', netTotal: '0', lines: [] } as never,
    { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', revisionId: 'b', type: 'LEM', title: 'LEM', currency: 'USD', billingPeriod: 'ANNUAL', sortOrder: 3, subtotal: '0', discountTotal: '0', netTotal: '0', lines: [] } as never,
  ],
  adjustments: [],
});

describe('LogoKalemPdfService', () => {
  const service = new LogoKalemPdfService({ htmlToPdf: jest.fn() } as never);
  const pages = (html: string) => (html.match(/<section class="page/g) ?? []).length;

  it.each(['tr', 'az', 'en'] as const)('%s dilinde kurumsal teklif ve e-posta üretir', (language) => {
    const html = service.html(detail(language));
    const mail = service.email(detail(language));
    expect(pages(html)).toBe(9);
    expect(html).toContain('1 / 9');
    expect(html).toContain('9 / 9');
    expect(html).toContain('&lt;Ema &amp; Agro&gt;');
    expect(mail.subject).toContain('LK-2026-AAAAAAAA-R00');
    expect(mail.html).toContain('cid:kalem-logo');
  });

  it('referans ve sertifika seçilmezse üç ek sayfayı kaldırır', () => {
    expect(pages(service.html(detail('tr', false)))).toBe(8);
  });

  it('satır indirim oranlarını ve bölümün dört kalemli özetini gösterir', () => {
    const offer = detail('tr', false);
    offer.sections[0].subtotal = '180.45';
    offer.sections[0].discountTotal = '10.30';
    offer.sections[0].netTotal = '170.15';
    offer.sections[0].lines = [
      { name: 'Yüzdeli', unit: 'Adet', currency: 'USD', quantity: '3', unitPrice: '10.15', discountType: 'PERCENT', discountValue: '10', grossTotal: '30.45', discountTotal: '3.05', netTotal: '27.40' } as never,
      { name: 'Sabit', unit: 'Adet', currency: 'USD', quantity: '2', unitPrice: '25', discountType: 'FIXED', discountValue: '7.25', grossTotal: '50.00', discountTotal: '7.25', netTotal: '42.75' } as never,
      { name: 'İndirimsiz', unit: 'Adet', currency: 'USD', quantity: '1', unitPrice: '100', discountType: 'NONE', discountValue: '0', grossTotal: '100.00', discountTotal: '0.00', netTotal: '100.00' } as never,
    ];

    const html = service.html(offer);
    expect(html).toContain('%10,00');
    expect(html).toContain('%14,50');
    expect(html).toContain('%0,00');
    expect(html).toContain('Toplam Liste Fiyatı');
    expect(html).toContain('180,45 USD');
    expect(html).toContain('%5,71');
    expect(html).toContain('10,30 USD');
    expect(html).toContain('170,15 USD');
  });

  it.each([
    ['tr', 'Toplam Liste Fiyatı', '%10,00'],
    ['az', 'Ümumi Siyahı Qiyməti', '10,00%'],
    ['en', 'Total List Price', '10.00%'],
  ] as const)('%s bölüm özetini ve oranları dile uygun biçimler', (language, label, rate) => {
    const offer = detail(language, false);
    offer.sections[0].subtotal = '100.00';
    offer.sections[0].discountTotal = '10.00';
    offer.sections[0].netTotal = '90.00';
    offer.sections[0].lines[0].discountType = 'PERCENT';
    offer.sections[0].lines[0].discountValue = '10';
    offer.sections[0].lines[0].discountTotal = '10.00';
    offer.sections[0].lines[0].netTotal = '90.00';
    const html = service.html(offer);
    expect(html).toContain(label);
    expect(html).toContain(rate);
  });

  it('çok sayfalı fiyat bölümünde özeti yalnız son grid sayfasına ekler', () => {
    const offer = detail('tr', false);
    offer.sections[0].lines = Array.from({ length: 10 }, (_, index) => ({ ...offer.sections[0].lines[0], name: `Ürün ${index + 1}` } as never));
    const html = service.html(offer);
    expect((html.match(/class="section-summary"/g) ?? [])).toHaveLength(1);
    expect(html.indexOf('Ürün 10')).toBeLessThan(html.indexOf('class="section-summary"'));
  });
});

describe('FixLogoKalemObjectCatalogName migration', () => {
  it('yalnız bilinen hatalı ad ve açıklama birleşimini koşullu düzeltir', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new FixLogoKalemObjectCatalogName1784650600000().up({ query } as never);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain(`"code" = 'LOGO-T3-OBJE2'`);
    expect(sql).toContain(`"nameTr" = 'Logo Tiger 3 Object Ana Paket'`);
    expect(sql).toContain(`BTRIM(COALESCE("descriptionTr", '')) = 'Obje 2kullanıcı arttırımı'`);
    expect(sql).toContain(`SET "nameTr" = 'Obje 2 Kullanıcı Artırımı'`);
  });
});

describe('LogoKalemService finans ve gönderim korumaları', () => {
  const manager = { transaction: jest.fn() };
  const mail = { enabled: true, send: jest.fn() };
  const pdf = { render: jest.fn(), email: jest.fn() };
  const service = new LogoKalemService({} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, manager as never, pdf as never, mail as never);

  it('yüzde ve sabit satır indirimlerini kuruş hassasiyetinde hesaplar', () => {
    const percent = (service as any).calculateLine({ name: 'A', quantity: '3', unitPrice: '10.15', discountType: 'PERCENT', discountValue: '10' }, 0);
    const fixed = (service as any).calculateLine({ name: 'B', quantity: '2', unitPrice: '25', discountType: 'FIXED', discountValue: '7.25' }, 0);
    expect(percent).toMatchObject({ grossTotal: '30.45', discountTotal: '3.05', netTotal: '27.40' });
    expect(fixed).toMatchObject({ grossTotal: '50.00', discountTotal: '7.25', netTotal: '42.75' });
  });

  it('SMTP başarısızlığında transaction başlatmaz ve revizyonu kilitlemez', async () => {
    jest.spyOn(service, 'detail').mockResolvedValue(detail('tr'));
    pdf.render.mockResolvedValue(Buffer.from('pdf'));
    pdf.email.mockReturnValue({ subject: 'x', text: 'x', html: 'x' });
    mail.send.mockResolvedValue(false);
    await expect(service.send(detail().quote.id)).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.transaction).not.toHaveBeenCalled();
  });

  it('kilitli PDF snapshot SHA-256 bütünlüğünü doğrular', async () => {
    const locked = detail('tr'); locked.revision.lockedAt = new Date();
    jest.spyOn(service, 'detail').mockResolvedValue(locked);
    const snapshot = Buffer.from('immutable-pdf');
    const query = { addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(), getOne: jest.fn().mockResolvedValue({ pdfSnapshot: snapshot, pdfSha256: 'yanlis' }) };
    (service as any).revisions = { createQueryBuilder: jest.fn().mockReturnValue(query) };
    await expect(service.renderPdf(locked.quote.id)).rejects.toThrow('snapshot bütünlüğü');
  });
});

describe('SaveLogoKalemQuoteDto', () => {
  it('iç içe satır ve e-posta doğrulamalarını uygular', async () => {
    const dto = plainToInstance(SaveLogoKalemQuoteDto, { customerName: 'Ema', contactEmail: 'hatalı', language: 'de', projectTitle: 'P', quoteDate: 'x', senderName: 'C', sections: [{ type: 'MAIN', title: 'L', currency: 'USD', lines: [{ name: 'A', quantity: 'x', unitPrice: '10' }] }], adjustments: [] });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toEqual(expect.arrayContaining(['contactEmail', 'language', 'quoteDate', 'sections']));
  });
});
