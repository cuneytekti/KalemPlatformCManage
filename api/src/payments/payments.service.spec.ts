import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../entities/order.entity';
import { PashaEcommService } from './pasha-ecomm.service';
import { PaymentsService } from './payments.service';

describe('PashaEcommService.parse', () => {
  it('ECOMM "KEY: value" satır formatını ayrıştırır', () => {
    const parsed = PashaEcommService.parse(
      'TRANSACTION_ID: abc+DEF/123=\nRESULT: OK\nRESULT_CODE: 000\n',
    );
    expect(parsed).toEqual({ TRANSACTION_ID: 'abc+DEF/123=', RESULT: 'OK', RESULT_CODE: '000' });
  });

  it('bozuk satırları yok sayar', () => {
    expect(PashaEcommService.parse('garip satir\nRESULT: FAILED')).toEqual({ RESULT: 'FAILED' });
  });
});

describe('PaymentsService', () => {
  let service: PaymentsService;
  let orders: Record<string, jest.Mock>;
  let tenants: { findOneBy: jest.Mock };
  let pasha: {
    enabled: boolean;
    registerTransaction: jest.Mock;
    checkTransaction: jest.Mock;
    closeBusinessDay: jest.Mock;
  };
  let tenantsService: { createAndProvision: jest.Mock };
  let mail: { send: jest.Mock };

  const input = {
    companyName: 'Örnek Market',
    contactEmail: 'sahib@ornek.az',
    slug: 'ornek',
    seats: 10,
    posTerminals: 2,
    mobileTerminals: 1,
  };

  beforeEach(() => {
    orders = {
      find: jest.fn(),
      findOneBy: jest.fn().mockResolvedValue(null),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'o1', ...x })),
    };
    tenants = { findOneBy: jest.fn().mockResolvedValue(null) };
    pasha = {
      enabled: true,
      registerTransaction: jest.fn(async () => ({
        transId: 'TRANS123',
        redirectUrl: 'https://ecomm.pashabank.az:8463/ecomm2/ClientHandler?trans_id=TRANS123',
      })),
      checkTransaction: jest.fn(async () => ({ ok: true, resultCode: '000' })),
      closeBusinessDay: jest.fn(),
    };
    tenantsService = { createAndProvision: jest.fn(async () => ({ id: 't1', slug: 'ornek' })) };
    mail = { send: jest.fn(async () => true) };
    service = new PaymentsService(
      orders as never,
      tenants as never,
      pasha as never,
      tenantsService as never,
      mail as never,
      {
        get: jest.fn((k: string) =>
          k === 'defaultPrices'
            ? { user: '15.00', pos: '49.00', mobile: '19.00' }
            : 'kalemplatform.com',
        ),
      } as never,
    );
  });

  describe('createOrder', () => {
    it('fiyatı sunucuda hesaplar ve bankaya kuruş cinsinden yollar', async () => {
      const res = await service.createOrder(input, '1.2.3.4');
      // 10×15 + 2×49 + 1×19 = 267.00 AZN = 26700 kuruş
      expect(pasha.registerTransaction).toHaveBeenCalledWith(
        26700, '1.2.3.4', expect.stringContaining('ornek'), 'az',
      );
      expect(orders.save).toHaveBeenCalledWith(expect.objectContaining({ monthlyTotal: '267.00' }));
      expect(res.redirectUrl).toContain('ClientHandler');
    });

    it('slug mevcut tenant ile çakışırsa reddedilir', async () => {
      tenants.findOneBy.mockResolvedValue({ id: 't-var' });
      await expect(service.createOrder(input, '1.2.3.4')).rejects.toBeInstanceOf(BadRequestException);
      expect(pasha.registerTransaction).not.toHaveBeenCalled();
    });

    it('ödeme sistemi yapılandırılmamışsa reddedilir', async () => {
      pasha.enabled = false;
      await expect(service.createOrder(input, '1.2.3.4')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('handleCallback', () => {
    const pendingOrder = () => ({
      id: 'o1', ...input, monthlyTotal: '267.00', currency: 'AZN',
      status: OrderStatus.PENDING_PAYMENT, pashaTransId: 'TRANS123', clientIp: '1.2.3.4',
      resultCode: undefined as string | undefined, tenantId: undefined as string | undefined,
    });

    it('banka OK → tenant kurulumu + karşılama e-postası + PROVISIONED', async () => {
      const order = pendingOrder();
      orders.findOneBy.mockResolvedValue(order);
      const res = await service.handleCallback('TRANS123');
      expect(pasha.checkTransaction).toHaveBeenCalledWith('TRANS123', '1.2.3.4');
      expect(tenantsService.createAndProvision).toHaveBeenCalledWith({
        name: 'Örnek Market', slug: 'ornek', contactEmail: 'sahib@ornek.az',
        licensedUsers: 10, licensedPosTerminals: 2, licensedMobileTerminals: 1,
      });
      expect(order.status).toBe(OrderStatus.PROVISIONED);
      expect(mail.send).toHaveBeenCalledWith(
        'sahib@ornek.az',
        expect.stringContaining('Kalem Platform'),
        expect.stringContaining('ornek.kalemplatform.com'),
      );
      expect(res.ok).toBe(true);
    });

    it('banka reddi → FAILED, kurulum başlamaz', async () => {
      const order = pendingOrder();
      orders.findOneBy.mockResolvedValue(order);
      pasha.checkTransaction.mockResolvedValue({ ok: false, resultCode: '116' });
      const res = await service.handleCallback('TRANS123');
      expect(order.status).toBe(OrderStatus.FAILED);
      expect(order.resultCode).toBe('116');
      expect(tenantsService.createAndProvision).not.toHaveBeenCalled();
      expect(res.ok).toBe(false);
    });

    it('idempotent: PROVISIONED siparişe ikinci callback kurulumu tekrarlamaz', async () => {
      orders.findOneBy.mockResolvedValue({ ...pendingOrder(), status: OrderStatus.PROVISIONED });
      const res = await service.handleCallback('TRANS123');
      expect(pasha.checkTransaction).not.toHaveBeenCalled();
      expect(tenantsService.createAndProvision).not.toHaveBeenCalled();
      expect(res.ok).toBe(true);
    });

    it('bilinmeyen trans_id → NotFound', async () => {
      orders.findOneBy.mockResolvedValue(null);
      await expect(service.handleCallback('YOK')).rejects.toThrow('Sipariş bulunamadı');
    });
  });
});
