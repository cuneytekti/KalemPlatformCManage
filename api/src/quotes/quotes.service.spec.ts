import { QuotesService } from './quotes.service';
import { BadRequestException } from '@nestjs/common';
import { QuoteDiscountType } from '../entities/quote.entity';

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
