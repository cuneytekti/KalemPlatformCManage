import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TenantStatus } from '../entities/tenant.entity';
import { msUntilNextBakuNight, TenantsService } from './tenants.service';

/** Tenant yaşam döngüsü durum makinesi smoke testleri (repo + docker mock'lu). */
describe('TenantsService', () => {
  let service: TenantsService;
  let repo: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let provisioning: { enqueue: jest.Mock; enqueueReconfigure: jest.Mock };
  let docker: {
    stopTenantStack: jest.Mock;
    startTenantStack: jest.Mock;
    removeTenantStackBySlug: jest.Mock;
  };
  let dbProvisioner: { dropTenantDatabase: jest.Mock };
  let mail: { send: jest.Mock };

  const tenant = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 't1',
    slug: 'musteri1',
    name: 'Müşteri 1',
    status: TenantStatus.ACTIVE,
    licensedUsers: 5,
    licensedPosTerminals: 1,
    licensedMobileTerminals: 0,
    ...over,
  });

  beforeEach(() => {
    repo = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
    };
    provisioning = { enqueue: jest.fn(), enqueueReconfigure: jest.fn() };
    docker = {
      stopTenantStack: jest.fn(),
      startTenantStack: jest.fn(),
      removeTenantStackBySlug: jest.fn(),
    };
    dbProvisioner = { dropTenantDatabase: jest.fn() };
    mail = { send: jest.fn(async () => true) };
    service = new TenantsService(
      repo as never,
      provisioning as never,
      docker as never,
      dbProvisioner as never,
      mail as never,
    );
  });

  describe('createAndProvision', () => {
    it('ayrılmış slug reddedilir', async () => {
      await expect(
        service.createAndProvision({ slug: 'panel', name: 'X' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(provisioning.enqueue).not.toHaveBeenCalled();
    });

    it('mevcut slug reddedilir', async () => {
      repo.findOneBy.mockResolvedValue(tenant());
      await expect(
        service.createAndProvision({ slug: 'musteri1', name: 'X' } as never),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('PENDING kaydeder ve kurulumu kuyruğa alır', async () => {
      repo.findOneBy.mockResolvedValue(null);
      repo.save.mockResolvedValue(tenant({ status: TenantStatus.PENDING }));
      const t = await service.createAndProvision({ slug: 'yeni', name: 'Yeni' } as never);
      expect(t.status).toBe(TenantStatus.PENDING);
      expect(provisioning.enqueue).toHaveBeenCalledWith('t1');
    });
  });

  describe('findOne', () => {
    it('bulunamayan tenant NotFound fırlatır', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('yok')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('retry', () => {
    it('yalnız FAILED yeniden denenebilir', async () => {
      repo.findOneBy.mockResolvedValue(tenant({ status: TenantStatus.ACTIVE }));
      await expect(service.retry('t1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('FAILED → PENDING + yeniden kuyruğa alma', async () => {
      repo.findOneBy.mockResolvedValue(tenant({ status: TenantStatus.FAILED }));
      const t = await service.retry('t1');
      expect(t.status).toBe(TenantStatus.PENDING);
      expect(provisioning.enqueue).toHaveBeenCalledWith('t1');
    });
  });

  describe('suspend / resume', () => {
    it('yalnız ACTIVE askıya alınabilir', async () => {
      repo.findOneBy.mockResolvedValue(tenant({ status: TenantStatus.PENDING }));
      await expect(service.suspend('t1')).rejects.toBeInstanceOf(BadRequestException);
      expect(docker.stopTenantStack).not.toHaveBeenCalled();
    });

    it('ACTIVE → SUSPENDED, container stack durdurulur', async () => {
      repo.findOneBy.mockResolvedValue(tenant());
      const t = await service.suspend('t1');
      expect(docker.stopTenantStack).toHaveBeenCalledWith('musteri1');
      expect(t.status).toBe(TenantStatus.SUSPENDED);
    });

    it('SUSPENDED → ACTIVE, container stack başlatılır', async () => {
      repo.findOneBy.mockResolvedValue(tenant({ status: TenantStatus.SUSPENDED }));
      const t = await service.resume('t1');
      expect(docker.startTenantStack).toHaveBeenCalledWith('musteri1');
      expect(t.status).toBe(TenantStatus.ACTIVE);
    });
  });

  describe('remove', () => {
    it('dropDatabase=false ise DB düşürülmez, kayıt DELETED kalır', async () => {
      repo.findOneBy.mockResolvedValue(tenant());
      const t = await service.remove('t1', false);
      expect(docker.removeTenantStackBySlug).toHaveBeenCalledWith('musteri1');
      expect(dbProvisioner.dropTenantDatabase).not.toHaveBeenCalled();
      expect(t.status).toBe(TenantStatus.DELETED);
    });

    it('dropDatabase=true ise tenant DB de düşürülür', async () => {
      repo.findOneBy.mockResolvedValue(tenant());
      await service.remove('t1', true);
      expect(dbProvisioner.dropTenantDatabase).toHaveBeenCalledWith('musteri1');
    });
  });

  describe('updateLicense — zamanlama ve bildirim', () => {
    it("applyAt='night': reconfigure bir sonraki 03:00 Bakü'ye zamanlanır", async () => {
      repo.findOneBy.mockResolvedValue(tenant({ contactEmail: 'musteri@ornek.az' }));
      await service.updateLicense('t1', {
        licensedUsers: 10, licensedPosTerminals: 2, licensedMobileTerminals: 0, applyAt: 'night',
      });
      const opts = provisioning.enqueueReconfigure.mock.calls[0][1] as { delayMs: number };
      expect(opts.delayMs).toBeGreaterThan(0);
      expect(opts.delayMs).toBeLessThanOrEqual(86_400_000);
      expect(mail.send).toHaveBeenCalledWith(
        'musteri@ornek.az',
        expect.stringContaining('Lisans güncellemesi'),
        expect.stringContaining('03:00'),
      );
    });

    it("applyAt verilmezse hemen uygulanır ve müşteri bilgilendirilir", async () => {
      repo.findOneBy.mockResolvedValue(tenant({ contactEmail: 'musteri@ornek.az' }));
      await service.updateLicense('t1', {
        licensedUsers: 10, licensedPosTerminals: 2, licensedMobileTerminals: 0,
      });
      expect(provisioning.enqueueReconfigure).toHaveBeenCalledWith('t1', { delayMs: 0 });
      expect(mail.send).toHaveBeenCalledWith(
        'musteri@ornek.az',
        expect.any(String),
        expect.stringContaining('birkaç dakika'),
      );
    });

    it('contactEmail yoksa e-posta atılmaz, akış kırılmaz', async () => {
      repo.findOneBy.mockResolvedValue(tenant({ contactEmail: undefined }));
      await service.updateLicense('t1', {
        licensedUsers: 10, licensedPosTerminals: 2, licensedMobileTerminals: 0,
      });
      expect(mail.send).not.toHaveBeenCalled();
    });
  });

  describe('updateLicense', () => {
    it('PENDING tenant için lisans güncellenemez', async () => {
      repo.findOneBy.mockResolvedValue(tenant({ status: TenantStatus.PENDING }));
      await expect(
        service.updateLicense('t1', {
          licensedUsers: 10,
          licensedPosTerminals: 2,
          licensedMobileTerminals: 1,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lisans boyutlarını yazar ve reconfigure kuyruğa alınır', async () => {
      repo.findOneBy.mockResolvedValue(tenant());
      const t = await service.updateLicense('t1', {
        licensedUsers: 10,
        licensedPosTerminals: 2,
        licensedMobileTerminals: 1,
      });
      expect(t.licensedUsers).toBe(10);
      expect(t.licensedPosTerminals).toBe(2);
      expect(t.licensedMobileTerminals).toBe(1);
      expect(provisioning.enqueueReconfigure).toHaveBeenCalledWith('t1', { delayMs: 0 });
    });
  });
});

describe('msUntilNextBakuNight', () => {
  it('03:00 Bakü öncesinde aynı gecenin penceresini hedefler', () => {
    // 22:00 UTC = 02:00 Bakü → 1 saat sonra 03:00 Bakü (23:00 UTC)
    const ms = msUntilNextBakuNight(new Date('2026-07-08T22:00:00Z'));
    expect(ms).toBe(3_600_000);
  });

  it('03:00 Bakü sonrasında ertesi gecenin penceresini hedefler', () => {
    // 08:00 UTC = 12:00 Bakü → ertesi 03:00 Bakü = 15 saat sonra
    const ms = msUntilNextBakuNight(new Date('2026-07-08T08:00:00Z'));
    expect(ms).toBe(15 * 3_600_000);
  });

  it('her zaman 0 < delay <= 24 saat aralığındadır', () => {
    const ms = msUntilNextBakuNight();
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(86_400_000);
  });
});
