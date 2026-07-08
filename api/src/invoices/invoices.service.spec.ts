import { InvoiceStatus } from '../entities/invoice.entity';
import { LicenseStatus } from '../entities/license.entity';
import { TenantStatus } from '../entities/tenant.entity';
import { InvoicesService } from './invoices.service';

/** Segment bazlı pro-rata faturalama testleri (repo/mail/docker mock'lu). */
describe('InvoicesService', () => {
  let service: InvoicesService;
  let invoices: Record<string, jest.Mock>;
  let tenants: Record<string, jest.Mock>;
  let licenses: { find: jest.Mock };
  let mail: { enabled: boolean; send: jest.Mock };

  const license = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'l1',
    tenantId: 't1',
    seats: 10,
    posTerminals: 2,
    mobileTerminals: 0,
    pricePerUser: '10.00',
    pricePerPosTerminal: '50.00',
    pricePerMobileTerminal: '0.00',
    currency: 'AZN',
    validFrom: '2026-07-01',
    validUntil: undefined,
    status: LicenseStatus.ACTIVE,
    createdAt: new Date('2026-07-01'),
    ...over,
  });

  beforeEach(() => {
    invoices = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'inv1', ...x })),
    };
    tenants = { findBy: jest.fn(), findOneBy: jest.fn(), update: jest.fn() };
    licenses = { find: jest.fn() };
    mail = { enabled: true, send: jest.fn(async () => true) };
    service = new InvoicesService(
      invoices as never,
      tenants as never,
      licenses as never,
      { renderPdf: jest.fn(async () => Buffer.from('pdf')) } as never,
      mail as never,
      { stopTenantStack: jest.fn() } as never,
      { get: jest.fn(() => 0) } as never,
    );
  });

  describe('generateForPeriod — segment bazlı pro-rata', () => {
    beforeEach(() => {
      tenants.findBy.mockResolvedValue([{ id: 't1', slug: 'demo', status: TenantStatus.ACTIVE }]);
      invoices.findOneBy.mockResolvedValue(null); // mevcut fatura yok
    });

    it('dönemi tam kapsayan tek lisans: oran 1, etiket eksiz', async () => {
      licenses.find.mockResolvedValue([license()]);
      const [inv] = await service.generateForPeriod('2026-07');
      // 10×10 + 2×50 = 200.00
      expect(inv.total).toBe('200.00');
      expect(inv.lines).toHaveLength(2);
      expect(inv.lines[0].label).toBe('Kullanıcı lisansı');
      expect(inv.status).toBe(InvoiceStatus.DRAFT);
      expect(inv.dueDate).toBe('2026-07-15');
    });

    it('ay ortası değişiklik: iki segment, gün oranlarıyla böler', async () => {
      // 1-15 Temmuz eski lisans (validUntil=16 hariç → 15 gün), 16-31 yeni (16 gün)
      licenses.find.mockResolvedValue([
        license({ validUntil: '2026-07-16', status: LicenseStatus.EXPIRED }),
        license({ id: 'l2', seats: 20, validFrom: '2026-07-16', createdAt: new Date('2026-07-16') }),
      ]);
      const [inv] = await service.generateForPeriod('2026-07');
      // Segment 1 (15/31): kullanıcı 100×15/31=48.39, kasa 100×15/31=48.39
      // Segment 2 (16/31): kullanıcı 200×16/31=103.23, kasa 100×16/31=51.61
      expect(inv.lines).toHaveLength(4);
      expect(inv.lines[0].label).toContain('pro-rata %48');
      expect(inv.lines[0].label).toContain('01.07–15.07');
      expect(inv.lines[2].label).toContain('16.07–31.07');
      expect(inv.total).toBe('251.62');
    });

    it('CANCELLED lisans ve dönem dışı lisans hesaba katılmaz', async () => {
      licenses.find.mockResolvedValue([
        license({ status: LicenseStatus.CANCELLED }),
        license({ id: 'l0', validFrom: '2026-05-01', validUntil: '2026-06-01' }),
      ]);
      const created = await service.generateForPeriod('2026-07');
      expect(created).toHaveLength(0);
    });

    it('aynı tenant+dönem için mükerrer fatura üretmez (idempotent)', async () => {
      invoices.findOneBy.mockResolvedValue({ id: 'mevcut' });
      const created = await service.generateForPeriod('2026-07');
      expect(created).toHaveLength(0);
      expect(invoices.save).not.toHaveBeenCalled();
    });

    it('geçersiz dönem formatı reddedilir', async () => {
      await expect(service.generateForPeriod('07-2026')).rejects.toThrow('YYYY-MM');
    });
  });

  describe('recalculateDraft', () => {
    it('DRAFT faturayı yeni segmentlerle günceller', async () => {
      invoices.findOneBy.mockResolvedValue({
        id: 'inv1', tenantId: 't1', period: '2026-07',
        status: InvoiceStatus.DRAFT, lines: [], total: '0.00', currency: 'AZN',
      });
      licenses.find.mockResolvedValue([license()]);
      const updated = await service.recalculateDraft('t1', '2026-07');
      expect(updated!.total).toBe('200.00');
      expect(invoices.save).toHaveBeenCalled();
    });

    it('SENT faturaya dokunmaz', async () => {
      invoices.findOneBy.mockResolvedValue({ id: 'inv1', status: InvoiceStatus.SENT });
      const result = await service.recalculateDraft('t1', '2026-07');
      expect(result).toBeNull();
      expect(invoices.save).not.toHaveBeenCalled();
    });

    it('fatura yoksa sessizce null döner', async () => {
      invoices.findOneBy.mockResolvedValue(null);
      expect(await service.recalculateDraft('t1', '2026-07')).toBeNull();
    });
  });

  describe('markOverdue', () => {
    it('vadesi geçmiş SENT faturayı OVERDUE yapar ve müşteriye hatırlatma yollar', async () => {
      const inv = {
        id: 'inv1', tenantId: 't1', period: '2026-06',
        status: InvoiceStatus.SENT, dueDate: '2026-06-15', total: '200.00', currency: 'AZN',
      };
      const qb = {
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([inv]),
      };
      (invoices as never as { createQueryBuilder: jest.Mock }).createQueryBuilder =
        jest.fn(() => qb);
      tenants.findOneBy.mockResolvedValue({
        id: 't1', slug: 'demo', name: 'Demo', contactEmail: 'musteri@ornek.az',
      });
      await service.markOverdue();
      expect(inv.status).toBe(InvoiceStatus.OVERDUE);
      expect(invoices.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'inv1' }));
      expect(mail.send).toHaveBeenCalledWith(
        'musteri@ornek.az',
        expect.stringContaining('Ödeme hatırlatması'),
        expect.stringContaining('2026-06-15'),
      );
    });
  });
});
