import { QuotesService } from './quotes.service';
import { BadRequestException } from '@nestjs/common';
import { Quote, QuoteDiscountType, QuoteStatus } from '../entities/quote.entity';
import { QuoteActivityType } from '../entities/quote-activity.entity';

describe('QuotesService.computeMonthlyTotal', () => {
  const base = {
    customerName: 'Test',
    seats: 5,
    posTerminals: 2,
    mobileTerminals: 3,
    pricePerUser: '15.00',
    pricePerPosTerminal: '49.00',
    pricePerMobileTerminal: '19.00',
  };

  it('üç boyutu doğru toplar: 5×15 + 2×49 + 3×19 = 230.00', () => {
    expect(QuotesService.computeMonthlyTotal(base)).toBe('230.00');
  });

  it('mobil terminal 0 ise katkısı olmaz', () => {
    expect(
      QuotesService.computeMonthlyTotal({ ...base, mobileTerminals: 0 }),
    ).toBe('173.00');
  });

  it('kuruş hassasiyetini korur (float hatası yok)', () => {
    expect(
      QuotesService.computeMonthlyTotal({
        ...base,
        seats: 3,
        posTerminals: 1,
        mobileTerminals: 0,
        pricePerUser: '0.10',
        pricePerPosTerminal: '0.20',
      }),
    ).toBe('0.50');
  });
});

describe('QuotesService.computeFinancials', () => {
  const base = {
    customerName: 'Test',
    seats: 5,
    posTerminals: 2,
    mobileTerminals: 3,
    pricePerUser: '15.00',
    pricePerPosTerminal: '49.00',
    pricePerMobileTerminal: '19.00',
  };

  it('kurulum yokken ilk yıl toplamını 12 aylık lisans olarak hesaplar', () => {
    expect(QuotesService.computeFinancials(base)).toEqual({
      monthlyTotal: '230.00',
      setupNetTotal: '0.00',
      firstYearTotal: '2760.00',
    });
  });

  it('sabit indirimi kurulum bedelinden düşer', () => {
    expect(QuotesService.computeFinancials({
      ...base,
      setupFee: '2500.00',
      discountType: QuoteDiscountType.FIXED,
      discountValue: '250.00',
    })).toEqual({
      monthlyTotal: '230.00',
      setupNetTotal: '2250.00',
      firstYearTotal: '5010.00',
    });
  });

  it('yüzde indirimini kuruş hassasiyetinde hesaplar', () => {
    expect(QuotesService.computeFinancials({
      ...base,
      setupFee: '99.99',
      discountType: QuoteDiscountType.PERCENT,
      discountValue: '12.5',
    }).setupNetTotal).toBe('87.49');
  });

  it('sabit indirim kurulum bedelini aşamaz', () => {
    expect(() => QuotesService.computeFinancials({
      ...base,
      setupFee: '100',
      discountType: QuoteDiscountType.FIXED,
      discountValue: '100.01',
    })).toThrow(BadRequestException);
  });

  it('yüzde indirim 0-100 aralığında olmalıdır', () => {
    expect(() => QuotesService.computeFinancials({
      ...base,
      setupFee: '100',
      discountType: QuoteDiscountType.PERCENT,
      discountValue: '100.01',
    })).toThrow(BadRequestException);
  });
});

describe('QuotesService teklif gönderimi ve süreç kaydı', () => {
  const quote = () => ({
    id: '91a48ea2-a406-4e73-a346-7fc976bb0ee7', quoteNumber: 'KL-2026-12345678',
    customerName: 'Ema Agro', contactName: 'Ahmet Bey', contactEmail: 'ahmet@example.com',
    status: QuoteStatus.DRAFT,
  } as Quote);

  function setup(mailResult: boolean) {
    const currentQuote = quote();
    const quoteRepository = { findOneBy: jest.fn().mockResolvedValue(currentQuote) };
    const activityRepository = { find: jest.fn() };
    const transactionQuoteRepository = { save: jest.fn(async (value) => value) };
    const transactionActivityRepository = {
      create: jest.fn((value) => value), save: jest.fn(async (value) => value),
    };
    const dataSource = {
      transaction: jest.fn(async (callback) => callback({
        getRepository: (entity: unknown) => entity === Quote ? transactionQuoteRepository : transactionActivityRepository,
      })),
    };
    const mail = { enabled: true, send: jest.fn().mockResolvedValue(mailResult) };
    const pdf = { renderPdf: jest.fn().mockResolvedValue(Buffer.from('pdf')) };
    const email = { build: jest.fn().mockReturnValue({
      subject: 'Konu', text: 'Metin', html: '<p>Metin</p>', attachmentFilename: 'teklif.pdf',
      logo: Buffer.from('logo'), logoCid: 'kalem-logo@cmanage',
    }) };
    const service = new QuotesService(
      quoteRepository as never, activityRepository as never, {} as never, dataSource as never,
      {} as never, mail as never, pdf as never, email as never,
    );
    return { service, currentQuote, dataSource, mail, transactionQuoteRepository, transactionActivityRepository };
  }

  it('başarılı SMTP gönderiminden sonra statü, dil, tarih ve hareketi birlikte kaydeder', async () => {
    const test = setup(true);
    const result = await test.service.sendByEmail(test.currentQuote.id, 'tr', 'admin@kalem.az');
    expect(result.status).toBe(QuoteStatus.SENT);
    expect(result.sentLanguage).toBe('tr');
    expect(result.sentAt).toBeInstanceOf(Date);
    expect(test.mail.send).toHaveBeenCalledWith(
      'ahmet@example.com', 'Konu', 'Metin', expect.arrayContaining([
        expect.objectContaining({ filename: 'teklif.pdf', contentType: 'application/pdf' }),
        expect.objectContaining({ cid: 'kalem-logo@cmanage', contentDisposition: 'inline' }),
      ]), '<p>Metin</p>',
    );
    expect(test.transactionActivityRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      type: QuoteActivityType.EMAIL_SENT, status: QuoteStatus.SENT, createdByEmail: 'admin@kalem.az',
    }));
  });

  it('SMTP başarısızsa teklif durumunu ve süreç geçmişini değiştirmez', async () => {
    const test = setup(false);
    await expect(test.service.sendByEmail(test.currentQuote.id, 'az')).rejects.toThrow(BadRequestException);
    expect(test.currentQuote.status).toBe(QuoteStatus.DRAFT);
    expect(test.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('manuel süreç kaydında notu zorunlu tutar', async () => {
    const test = setup(true);
    await expect(test.service.addActivity(test.currentQuote.id, {
      type: QuoteActivityType.PHONE_CALL, note: ' ',
    })).rejects.toThrow(BadRequestException);
    expect(test.dataSource.transaction).not.toHaveBeenCalled();
  });
});
