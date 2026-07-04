import { QuotesService } from './quotes.service';

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
