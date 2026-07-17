import { validate } from 'class-validator';
import { QuoteActivityType } from '../entities/quote-activity.entity';
import { QuoteDiscountType, QuoteStatus } from '../entities/quote.entity';
import { CreateQuoteActivityDto, CreateQuoteDto } from './quotes.controller';

describe('CreateQuoteDto', () => {
  const valid = () => Object.assign(new CreateQuoteDto(), {
    customerName: 'Ema Agro',
    seats: 5,
    posTerminals: 1,
    mobileTerminals: 0,
    pricePerUser: '15.00',
    pricePerPosTerminal: '49.00',
    pricePerMobileTerminal: '0',
  });

  it('kurumsal teklif alanlarını kabul eder', async () => {
    const dto = Object.assign(valid(), {
      contactName: 'Zaur Bey',
      setupFee: '2500.00',
      discountType: QuoteDiscountType.PERCENT,
      discountValue: '10',
      projectDurationText: '45-65 iş günü',
      paymentTermsText: 'Yüzde 50 siparişte.',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('bilinmeyen indirim tipini reddeder', async () => {
    const dto = Object.assign(valid(), { discountType: 'INVALID' });
    expect((await validate(dto)).some((error) => error.property === 'discountType')).toBe(true);
  });
});

describe('CreateQuoteActivityDto', () => {
  it('geçerli süreç kaydını kabul eder', async () => {
    const dto = Object.assign(new CreateQuoteActivityDto(), {
      type: QuoteActivityType.PHONE_CALL,
      status: QuoteStatus.FOLLOW_UP,
      note: 'Müşteri arandı, yönetim değerlendirmesi bekleniyor.',
      activityAt: '2026-07-17T10:30:00.000Z',
    });
    expect(await validate(dto)).toHaveLength(0);
  });

  it('boş notu ve geçersiz tarihi reddeder', async () => {
    const dto = Object.assign(new CreateQuoteActivityDto(), {
      type: QuoteActivityType.VISIT, status: QuoteStatus.MEETING, note: '', activityAt: 'bugün',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'note')).toBe(true);
    expect(errors.some((error) => error.property === 'activityAt')).toBe(true);
  });
});
