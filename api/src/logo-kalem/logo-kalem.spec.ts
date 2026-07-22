import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QuoteStatus } from '../entities/quote.entity';
import { SaveLogoKalemQuoteDto } from './logo-kalem.dto';
import { LogoKalemPdfService } from './logo-kalem-pdf.service';
import { LogoKalemService, LogoKalemDetail } from './logo-kalem.service';
import { FixLogoKalemObjectCatalogName1784650600000 } from '../migrations/1784650600000-FixLogoKalemObjectCatalogName';
import { FixLogoKalemObjectCatalogTranslations1784653000000 } from '../migrations/1784653000000-FixLogoKalemObjectCatalogTranslations';
import { LogoKalemLemPercentagePricing1784660000000 } from '../migrations/1784660000000-LogoKalemLemPercentagePricing';

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

  it.each([
    ['tr', 'LOGO Lisansları', 'KALEM Lisansları'],
    ['az', 'LOGO Lisenziyaları', 'KALEM Lisenziyaları'],
    ['en', 'LOGO Licences', 'KALEM Licences'],
  ] as const)('%s PDF içinde LOGO ve KLM kodlu lisansları ayrı tablolara böler', (language, logoTitle, kalemTitle) => {
    const offer = detail(language, false);
    offer.sections[0].lines = [
      { catalogCode: 'LOGO-T3-ERP', name: 'Logo Tiger', unit: 'Lisans', currency: 'USD', quantity: '1', unitPrice: '100.00', discountType: 'PERCENT', discountValue: '10', grossTotal: '100.00', discountTotal: '10.00', netTotal: '90.00' } as never,
      { catalogCode: 'KLM-RETAIL', name: 'Kalem Retail', unit: 'Lisans', currency: 'USD', quantity: '2', unitPrice: '100.00', discountType: 'NONE', discountValue: '0', grossTotal: '200.00', discountTotal: '0.00', netTotal: '200.00' } as never,
    ];
    const html = service.html(offer);
    expect(html).toContain(`<h1>${logoTitle}</h1>`);
    expect(html).toContain(`<h1>${kalemTitle}</h1>`);
    expect(html.indexOf(logoTitle)).toBeLessThan(html.indexOf(kalemTitle));
    expect((html.match(/class="section-summary"/g) ?? [])).toHaveLength(2);
  });

  it.each([
    ['tr', 'Lisans Liste Toplamı', 'Yıllık LEM Oranı', 'Yıllık LEM Bedeli', '%12,50', '1.000,00 USD'],
    ['az', 'Lisenziya Siyahı Cəmi', 'İllik LEM Faizi', 'İllik LEM Məbləği', '12,50%', '1.000,00 USD'],
    ['en', 'Licence List Total', 'Annual LEM Rate', 'Annual LEM Fee', '12.50%', '1,000.00 USD'],
  ] as const)('%s yüzdesel LEM hesabını PDF üzerinde açıklar', (language, baseLabel, rateLabel, feeLabel, rate, base) => {
    const offer = detail(language, false);
    offer.sections[3].subtotal = '125.00'; offer.sections[3].netTotal = '125.00';
    offer.sections[3].lines = [{ name: 'Yıllık LEM', unit: 'Yıl', currency: 'USD', quantity: '1', unitPrice: '125.00', pricingMode: 'LICENSE_PERCENT', ratePercent: '12.50', calculationBase: '1000.00', discountType: 'NONE', discountValue: '0', grossTotal: '125.00', discountTotal: '0.00', netTotal: '125.00' } as never];
    const html = service.html(offer);
    expect(html).toContain(baseLabel);
    expect(html).toContain(rateLabel);
    expect(html).toContain(feeLabel);
    expect(html).toContain(rate);
    expect(html).toContain(base);
  });

  it.each([
    ['tr', 'Lisans Bedelleri', 'Hizmet Bedelleri', 'KDV Dâhil Toplam', 'Teklif Genel Toplamı', 'KDV Hariç Toplam', 'KDV Dâhil Toplam', '126,00 USD', '151,20 USD'],
    ['az', 'Lisenziya Məbləğləri', 'Xidmət Məbləğləri', 'ƏDV Daxil Cəm', 'Təklifin Ümumi Məbləği', 'ƏDV-siz Ümumi Məbləğ', 'ƏDV Daxil Ümumi Məbləğ', '126,00 USD', '151,20 USD'],
    ['en', 'Licence Fees', 'Service Fees', 'Total incl. VAT', 'Proposal Total', 'Total Excl. VAT', 'Total Incl. VAT', '126.00 USD', '151.20 USD'],
  ] as const)('%s yatırım özetinde lisans ve hizmetleri ayırıp dönemsel bedelleri toplam dışında tutar', (language, licenseLabel, serviceLabel, totalLabel, proposalLabel, exclVatLabel, inclVatLabel, proposalNet, proposalTotal) => {
    const offer = detail(language, false);
    Object.assign(offer.sections[0], { subtotal: '100.00', discountTotal: '10.00', netTotal: '90.00' });
    Object.assign(offer.sections[1], { subtotal: '50.00', discountTotal: '0.00', netTotal: '50.00', lines: [{ name: 'Kurulum', unit: 'Hizmet', currency: 'USD', quantity: '1', unitPrice: '50.00', discountType: 'NONE', discountValue: '0', grossTotal: '50.00', discountTotal: '0.00', netTotal: '50.00' }] });
    offer.adjustments = [
      { target: 'MAIN', type: 'DISCOUNT', label: 'Proje indirimi', method: 'FIXED', value: '14', amount: '14.00' } as never,
      { target: 'MAIN', type: 'TAX', label: 'KDV', method: 'PERCENT', value: '20', amount: '25.20' } as never,
      { target: 'LEM', type: 'TAX', label: 'LEM vergisi', method: 'PERCENT', value: '20', amount: '6.00' } as never,
    ];
    offer.revision.mainTotal = '126.00'; offer.revision.taxTotal = '31.20'; offer.revision.maintenanceTotal = '20.00'; offer.revision.lemTotal = '30.00';
    const html = service.html(offer);
    expect(html).toContain(licenseLabel);
    expect(html).toContain(serviceLabel);
    expect(html).toContain(totalLabel);
    expect(html).toContain(proposalLabel);
    expect(html).toContain(exclVatLabel);
    expect(html).toContain(inclVatLabel);
    expect(html).toContain(proposalNet);
    expect(html).toContain(proposalTotal);
    expect(html).not.toContain('LEM vergisi');
    expect(html).not.toContain('Proje indirimi');
    expect(html).toContain(language === 'en' ? 'Monthly service and annual LEM fees are not included in the proposal total.' : language === 'az' ? 'Aylıq xidmət və illik LEM məbləğləri təklifin ümumi məbləğinə daxil deyil.' : 'Aylık hizmet ve yıllık LEM bedelleri teklif genel toplamına dahil değildir.');
  });

  it.each([
    ['tr', 'Mağaza Bazlı Açılış Maliyeti', 'Liste Tutarı', 'Şube Artırımı Sayısı', 'Net Yeni Mağaza Açılış Maliyeti', '67,50 USD'],
    ['az', 'Mağaza üzrə Açılış Xərci', 'Siyahı Məbləği', 'Filial Artırımı Sayı', 'Yeni Mağazanın Xalis Açılış Xərci', '67,50 USD'],
    ['en', 'Store Opening Cost', 'List Amount', 'Branch Increase Quantity', 'Net New Store Opening Cost', '67.50 USD'],
  ] as const)('%s mağaza maliyetini RETAIL_BRANCH net toplamını KLR-SUBE miktarına bölerek hesaplar', (language, title, listLabel, branchLabel, netLabel, netAmount) => {
    const offer = detail(language, false);
    offer.sections[0].lines = [
      { catalogCode: ' klr-sube ', catalogCategory: ' retail_branch ', name: 'Şube Paketi', unit: 'Şube', currency: 'USD', quantity: '2', unitPrice: '50.00', grossTotal: '100.00', discountType: 'PERCENT', discountValue: '10', discountTotal: '10.00', netTotal: '90.00' } as never,
      { catalogCode: 'KLR-MPOS', catalogCategory: 'RETAIL_BRANCH', name: 'Kasa Paketi', unit: 'Kasa', currency: 'USD', quantity: '1', unitPrice: '50.00', grossTotal: '50.00', discountType: 'FIXED', discountValue: '5', discountTotal: '5.00', netTotal: '45.00' } as never,
      { catalogCategory: 'LICENSE', name: 'Merkez Lisansı', unit: 'Lisans', currency: 'USD', quantity: '1', unitPrice: '500.00', grossTotal: '500.00', discountType: 'NONE', discountValue: '0', discountTotal: '0.00', netTotal: '500.00' } as never,
    ];
    offer.sections[1].lines = [{ catalogCategory: 'RETAIL_BRANCH', name: 'Hariç Hizmet', unit: 'Hizmet', currency: 'USD', quantity: '1', unitPrice: '900.00', grossTotal: '900.00', discountType: 'NONE', discountValue: '0', discountTotal: '0.00', netTotal: '900.00' } as never];
    offer.adjustments = [{ target: 'MAIN', type: 'DISCOUNT', label: 'Genel indirim', method: 'FIXED', value: '50', amount: '50.00' } as never, { target: 'MAIN', type: 'TAX', label: 'KDV', method: 'PERCENT', value: '20', amount: '100.00' } as never];
    const costLines = (service as any).storeCostLines(offer);
    const html = service.html(offer);
    expect(costLines.map((line: { name: string }) => line.name)).toEqual(['Şube Paketi', 'Kasa Paketi']);
    expect(costLines.reduce((sum: number, line: { grossTotal: string }) => sum + Number(line.grossTotal), 0)).toBe(150);
    expect(costLines.reduce((sum: number, line: { discountTotal: string }) => sum + Number(line.discountTotal), 0)).toBe(15);
    expect(costLines.reduce((sum: number, line: { netTotal: string }) => sum + Number(line.netTotal), 0)).toBe(135);
    expect(html).toContain(title);
    expect(html).toContain(listLabel);
    expect(html).toContain(branchLabel);
    expect(html).toContain(netLabel);
    expect(html).toContain('Şube Paketi');
    expect(html).toContain('Kasa Paketi');
    expect(html).toContain(netAmount);
    expect((html.match(/class="store-cost-summary"/g) ?? [])).toHaveLength(1);
  });

  it('RETAIL_BRANCH bulunmazsa yerelleştirilmiş boş durum gösterir', () => {
    const html = service.html(detail('az', false));
    expect(html).toContain('RETAIL_BRANCH kateqoriyalı məhsul əlavə edilməyib');
    expect(html).not.toContain('class="store-cost-summary"');
  });

  it('KLR-SUBE satırı veya geçerli miktarı yoksa bölme işlemi yerine açıklayıcı durum gösterir', () => {
    const offer = detail('tr', false);
    offer.sections[0].lines = [{ catalogCode: 'KLR-MPOS', catalogCategory: 'RETAIL_BRANCH', name: 'Kasa Paketi', unit: 'Kasa', currency: 'USD', quantity: '2', unitPrice: '50.00', grossTotal: '100.00', discountType: 'NONE', discountValue: '0', discountTotal: '0.00', netTotal: '100.00' } as never];
    const html = service.html(offer);
    expect(html).toContain('KLR-SUBE kodlu KL-Retail INT Şube Artırımı');
    expect(html).not.toContain('class="store-cost-summary"');
  });

  it('altı mağaza ürününü aşan detayları devam sayfalarına taşır ve özeti yalnız sonda gösterir', () => {
    const offer = detail('tr', false);
    offer.sections[0].lines = Array.from({ length: 16 }, (_, index) => ({ catalogCode: index === 0 ? 'KLR-SUBE' : 'KLR-MPOS', catalogCategory: 'RETAIL_BRANCH', name: `Mağaza Ürünü ${index + 1}`, unit: 'Adet', currency: 'USD', quantity: index === 0 ? '2' : '1', unitPrice: '10.00', grossTotal: index === 0 ? '20.00' : '10.00', discountType: 'NONE', discountValue: '0', discountTotal: '0.00', netTotal: index === 0 ? '20.00' : '10.00' } as never));
    const html = service.html(offer);
    expect(html).toContain('Mağaza Bazlı Açılış Maliyeti (2)');
    expect(html).toContain('Mağaza Bazlı Açılış Maliyeti (3)');
    expect((html.match(/class="store-cost-summary"/g) ?? [])).toHaveLength(1);
    expect(html.indexOf('Mağaza Ürünü 16')).toBeLessThan(html.indexOf('class="store-cost-summary"'));
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

describe('FixLogoKalemObjectCatalogTranslations migration', () => {
  it('eski AZ/EN katalog adlarını koşullu olarak yerelleştirir', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new FixLogoKalemObjectCatalogTranslations1784653000000().up({ query } as never);
    const sql = query.mock.calls[0][0] as string;
    expect(sql).toContain(`"code" = 'LOGO-T3-OBJE2'`);
    expect(sql).toContain(`THEN 'Obyekt 2 İstifadəçi Artırımı'`);
    expect(sql).toContain(`THEN 'Object 2 User Extension'`);
    expect(sql).toContain(`BTRIM(COALESCE("nameAz", '')) IN ('', 'Logo Tiger 3 Object Ana Paket')`);
    expect(sql).toContain(`BTRIM(COALESCE("nameEn", '')) IN ('', 'Logo Tiger 3 Object Ana Paket')`);
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

  it('teklif detayındaki katalog satırlarına ürün kodu ve kategorisini ekler', async () => {
    const sample = detail('tr');
    sample.quote.activeRevisionId = sample.revision.id;
    const line = { ...sample.sections[0].lines[0], sectionId: sample.sections[0].id, catalogItemId: 'catalog-1' } as never;
    const detailService = new LogoKalemService(
      { findOneBy: jest.fn().mockResolvedValue(sample.quote) } as never,
      { findOneBy: jest.fn().mockResolvedValue(sample.revision) } as never,
      { find: jest.fn().mockResolvedValue([sample.sections[0]]) } as never,
      { find: jest.fn().mockResolvedValue([line]) } as never,
      { find: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
      { findBy: jest.fn().mockResolvedValue([{ id: 'catalog-1', code: 'LOGO-T3-ERP', category: 'RETAIL_BRANCH' }]) } as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const result = await detailService.detail(sample.quote.id);
    expect(result.sections[0].lines[0].catalogCode).toBe('LOGO-T3-ERP');
    expect(result.sections[0].lines[0].catalogCategory).toBe('RETAIL_BRANCH');
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

  it('LEM tabanına yalnız MAIN brüt lisanslarını indirimlerden etkilenmeden dahil eder', () => {
    const base = (service as any).calculateLicenseBase([
      { type: 'MAIN', lines: [{ quantity: '2', unitPrice: '100', discountType: 'PERCENT', discountValue: '50' }, { quantity: '1', unitPrice: '25.55' }] },
      { type: 'SERVICE', lines: [{ quantity: '1', unitPrice: '500' }] },
      { type: 'MAINTENANCE', lines: [{ quantity: '1', unitPrice: '40' }] },
    ]);
    expect(base).toBe(225.55);
  });

  it('yıllık LEM tutarını lisans tabanı ve yüzde üzerinden kuruşa yuvarlar', () => {
    const line = (service as any).calculateLicensePercentLine({ name: 'LEM', ratePercent: '12.50', discountType: 'NONE', discountValue: '0', currency: 'USD' }, 0, 123.45);
    expect(line).toMatchObject({ pricingMode: 'LICENSE_PERCENT', quantity: '1', calculationBase: '123.45', ratePercent: '12.50', unitPrice: '15.43', grossTotal: '15.43', discountTotal: '0.00', netTotal: '15.43' });
  });

  it.each(['0', '-1', '100.01'])('geçersiz LEM oranını reddeder: %s', (ratePercent) => {
    expect(() => (service as any).calculateLicensePercentLine({ name: 'LEM', ratePercent, discountType: 'NONE', discountValue: '0' }, 0, 100)).toThrow('LEM oranı');
  });

  it('yüzdesel LEM satırına ek indirim uygulanmasını reddeder', () => {
    expect(() => (service as any).calculateLicensePercentLine({ name: 'LEM', ratePercent: '10', discountType: 'PERCENT', discountValue: '5' }, 0, 100)).toThrow('indirim uygulanamaz');
  });
});

describe('LogoKalemLemPercentagePricing migration', () => {
  it('eski satırları STANDARD bırakan geriye uyumlu sütunları ekler', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new LogoKalemLemPercentagePricing1784660000000().up({ query } as never);
    expect(query.mock.calls.map((call) => call[0]).join('\n')).toContain(`"pricingMode" varchar NOT NULL DEFAULT 'STANDARD'`);
    expect(query.mock.calls.map((call) => call[0]).join('\n')).toContain('"ratePercent" numeric(5,2)');
    expect(query.mock.calls.map((call) => call[0]).join('\n')).toContain('"calculationBase" numeric(14,2)');
  });
});

describe('SaveLogoKalemQuoteDto', () => {
  it('iç içe satır ve e-posta doğrulamalarını uygular', async () => {
    const dto = plainToInstance(SaveLogoKalemQuoteDto, { customerName: 'Ema', contactEmail: 'hatalı', language: 'de', projectTitle: 'P', quoteDate: 'x', senderName: 'C', sections: [{ type: 'MAIN', title: 'L', currency: 'USD', lines: [{ name: 'A', quantity: 'x', unitPrice: '10' }] }], adjustments: [] });
    const errors = await validate(dto);
    expect(errors.map((e) => e.property)).toEqual(expect.arrayContaining(['contactEmail', 'language', 'quoteDate', 'sections']));
  });
});
