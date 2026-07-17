import { Quote, QuoteDiscountType, QuoteStatus } from '../entities/quote.entity';
import { QuoteEmailService } from './quote-email.service';

describe('QuoteEmailService', () => {
  const service = new QuoteEmailService();
  const quote = {
    id: '1', quoteNumber: 'KL-2026-ABC12345', customerName: 'Ema Agro', contactName: 'Ahmet Yılmaz',
    contactEmail: 'ahmet@example.com', status: QuoteStatus.DRAFT, discountType: QuoteDiscountType.NONE,
  } as Quote;

  it.each([
    ['az', 'Hörmətli Ahmet Yılmaz', 'Qiymət təklifi', 'Kalem_Platform_Qiymet_Teklifi.pdf'],
    ['tr', 'Sayın Ahmet Yılmaz', 'Fiyat Teklifi', 'Kalem_Platform_Fiyat_Teklifi.pdf'],
    ['en', 'Dear Ahmet Yılmaz', 'Price Proposal', 'Kalem_Platform_Price_Proposal.pdf'],
  ] as const)('%s dilinde kurumsal içeriği üretir', (lang, greeting, subject, filename) => {
    const result = service.build(quote, lang);
    expect(result.subject).toContain(subject);
    expect(result.text).toContain(greeting);
    expect(result.text).toContain('+994 12 526 22 22');
    expect(result.text).toContain('www.kalemyazilim.az');
    expect(result.html).toContain('cid:kalem-logo@cmanage');
    expect(result.attachmentFilename).toBe(filename);
  });

  it('muhatap yoksa müşteri adını kullanır ve HTML karakterlerini kaçırır', () => {
    const result = service.build({ ...quote, contactName: undefined, customerName: '<Ema & Agro>' } as Quote, 'tr');
    expect(result.text).toContain('Sayın <Ema & Agro>');
    expect(result.html).toContain('Sayın &lt;Ema &amp; Agro&gt;');
    expect(result.html).not.toContain('Sayın <Ema & Agro>');
  });
});
