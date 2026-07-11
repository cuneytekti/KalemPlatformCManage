import { BadRequestException } from '@nestjs/common';
import { LicenseStatus } from '../entities/license.entity';
import { LicensesService } from './licenses.service';

/** Geçmiş koruyan lisans değişikliği testleri. */
describe('LicensesService.change', () => {
  let service: LicensesService;
  let repo: { findOneBy: jest.Mock; create: jest.Mock; save: jest.Mock; find: jest.Mock };
  let invoicesService: { recalculateDraft: jest.Mock };

  const today = new Date().toISOString().slice(0, 10);
  const current = () => ({
    id: 'l1',
    tenantId: 't1',
    seats: 10,
    posTerminals: 2,
    mobileTerminals: 0,
    pricePerUser: '10.00',
    pricePerPosTerminal: '50.00',
    pricePerMobileTerminal: '0.00',
    currency: 'AZN',
    validFrom: '2026-01-01',
    validUntil: undefined as string | undefined,
    status: LicenseStatus.ACTIVE,
  });

  beforeEach(() => {
    repo = {
      findOneBy: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      find: jest.fn(),
    };
    invoicesService = { recalculateDraft: jest.fn() };
    service = new LicensesService(repo as never, invoicesService as never);
  });

  it('eski satırı bugünle kapatır, yeni ACTIVE satır açar, DRAFT faturayı tetikler', async () => {
    const old = current();
    repo.findOneBy.mockResolvedValue(old);
    const next = await service.change('l1', { seats: 20, posTerminals: 2, mobileTerminals: 1 });

    expect(old.validUntil).toBe(today);
    expect(old.status).toBe(LicenseStatus.EXPIRED);
    expect(next.seats).toBe(20);
    expect(next.mobileTerminals).toBe(1);
    expect(next.validFrom).toBe(today);
    expect(next.status).toBe(LicenseStatus.ACTIVE);
    // fiyatlar verilmedi → eskisinden kopyalanır
    expect(next.pricePerUser).toBe('10.00');
    expect(invoicesService.recalculateDraft).toHaveBeenCalledWith('t1', today.slice(0, 7));
  });

  it('boyut ve fiyatlar aynıysa değişiklik yapmaz', async () => {
    repo.findOneBy.mockResolvedValue(current());
    const result = await service.change('l1', { seats: 10, posTerminals: 2, mobileTerminals: 0 });
    expect(result.id).toBe('l1');
    expect(repo.save).not.toHaveBeenCalled();
    expect(invoicesService.recalculateDraft).not.toHaveBeenCalled();
  });

  it('ACTIVE olmayan lisans değiştirilemez', async () => {
    repo.findOneBy.mockResolvedValue({ ...current(), status: LicenseStatus.CANCELLED });
    await expect(
      service.change('l1', { seats: 20, posTerminals: 2, mobileTerminals: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updateSeats geriye dönük uyumlu: change() üzerinden geçmiş korur', async () => {
    const old = current();
    repo.findOneBy.mockResolvedValue(old);
    const next = await service.updateSeats('l1', 25);
    expect(next.seats).toBe(25);
    expect(old.status).toBe(LicenseStatus.EXPIRED);
  });
});
