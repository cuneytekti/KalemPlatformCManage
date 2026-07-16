import { Quote, QuoteDiscountType, QuoteStatus } from '../entities/quote.entity';
import { QuotePdfService } from './quote-pdf.service';

describe('QuotePdfService', () => {
  const service = new QuotePdfService({ htmlToPdf: jest.fn() } as never);
  const quote = {
    id: '1f54d838-a9f7-4404-8bd2-d956178723bd',
    quoteNumber: 'KL-2026-1F54D838',
    customerName: 'Ema Agro',
    contactName: 'Zaur Bey',
    contactEmail: 'zaur@example.com',
    seats: 25,
    posTerminals: 6,
    mobileTerminals: 4,
    pricePerUser: '15.00',
    pricePerPosTerminal: '49.00',
    pricePerMobileTerminal: '19.00',
    monthlyTotal: '745.00',
    setupFee: '2500.00',
    discountType: QuoteDiscountType.PERCENT,
    discountValue: '10',
    setupNetTotal: '2250.00',
    firstYearTotal: '11190.00',
    currency: 'AZN',
    status: QuoteStatus.DRAFT,
    projectDurationText: '45-65 iş günü',
    paymentTermsText: 'Yüzde 50 siparişte.',
    createdAt: new Date('2026-07-17T00:00:00Z'),
    updatedAt: new Date('2026-07-17T00:00:00Z'),
  } as Quote;

  const pages = (html: string) => (html.match(/<section class="page/g) ?? []).length;

  it.each(['az', 'tr', 'en'] as const)('%s dilinde varsayılan beş sayfa üretir', (lang) => {
    const html = service.renderHtml(quote, lang);
    expect(pages(html)).toBe(5);
    expect(html).toContain('Sayfa 5 / 5'.replace('Sayfa', lang === 'az' ? 'Səhifə' : lang === 'en' ? 'Page' : 'Sayfa'));
    expect(html).not.toContain('__FOOTER__');
  });

  it('uzun notlar için devam sayfası ekler', () => {
    const html = service.renderHtml({ ...quote, notes: 'Uzun açıklama '.repeat(100) }, 'tr');
    expect(pages(html)).toBe(6);
    expect(html).toContain('Ek notlar - devamı');
  });

  it('onaylı referans varlığı olduğunda referans sayfası ekler', () => {
    const html = service.renderHtml(quote, 'tr', [{ name: 'Onaylı Müşteri', src: 'data:image/png;base64,AA==' }]);
    expect(pages(html)).toBe(6);
    expect(html).toContain('Seçili referanslar');
    expect(html).toContain('Onaylı Müşteri');
  });

  it('müşteri kaynaklı HTML içeriğini escape eder', () => {
    const html = service.renderHtml({ ...quote, customerName: '<script>alert(1)</script>' }, 'tr');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('kurumsal varsayılan şartları hedef dile çevirir', () => {
    const html = service.renderHtml({
      ...quote,
      projectDurationText: 'Onay ve gerekli erişimlerin sağlanmasından sonra tahmini 45-65 iş günü.',
      paymentTermsText: "Kurulum bedelinin %50'si siparişte, %50'si canlı geçiş tamamlandığında ödenir.",
    }, 'en');
    expect(html).toContain('Approximately 45-65 business days');
    expect(html).toContain('50% of the setup fee is due upon order');
  });
});
