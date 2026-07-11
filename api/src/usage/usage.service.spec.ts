import { TenantStatus } from '../entities/tenant.entity';
import { LicenseUsageResponse, UsageService } from './usage.service';

/** Kullanım toplayıcı + limit uyarıları testleri (fetch/crypto/mail mock'lu). */
describe('UsageService', () => {
  let service: UsageService;
  let tenants: { findBy: jest.Mock; update: jest.Mock };
  let mail: { send: jest.Mock };
  const fetchMock = jest.fn();

  const tenant = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 't1',
    slug: 'demo',
    name: 'Demo',
    status: TenantStatus.ACTIVE,
    jwtSecretEnc: 'enc',
    licensedUsers: 10,
    licensedPosTerminals: 2,
    licensedMobileTerminals: 0,
    lastUsage: undefined as unknown,
    ...over,
  });

  const usage = (users: number, pos = 1, limitUsers = 10): LicenseUsageResponse => ({
    users: { used: users, limit: limitUsers },
    posTerminals: { used: pos, limit: 2 },
    mobileTerminals: { used: 0, limit: 0 },
  });

  const respondWith = (body: LicenseUsageResponse) =>
    fetchMock.mockResolvedValue({ ok: true, json: async () => body });

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as never;
    tenants = { findBy: jest.fn(), update: jest.fn() };
    mail = { send: jest.fn(async () => true) };
    service = new UsageService(
      tenants as never,
      { decrypt: jest.fn(() => 'jwt-secret'), internalLicenseToken: jest.fn(() => 'tok123') } as never,
      mail as never,
      { get: jest.fn((k: string) => (k === 'admin.email' ? 'admin@kalemplatform.com' : 'kalemplatform.com')) } as never,
    );
  });

  it('servis token\'ıyla doğru adrese istek atar ve lastUsage yazar', async () => {
    respondWith(usage(5));
    const result = await service.collectOne(tenant() as never);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://kalem-api-demo:8080/internal/license',
      expect.objectContaining({ headers: { Authorization: 'Bearer tok123' } }),
    );
    expect(tenants.update).toHaveBeenCalledWith('t1', {
      lastUsage: expect.objectContaining({ users: 5, posTerminals: 1, alerts: [] }),
    });
    expect(result!.alerts).toHaveLength(0);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('%90 eşiğinde NEAR uyarısı üretir ve admin\'e e-posta yollar', async () => {
    respondWith(usage(9));
    const result = await service.collectOne(tenant() as never);
    expect(result!.alerts).toEqual([
      { dimension: 'users', used: 9, limit: 10, level: 'NEAR' },
    ]);
    expect(mail.send).toHaveBeenCalledWith(
      'admin@kalemplatform.com',
      expect.stringContaining('Lisans uyarısı'),
      expect.stringContaining('9/10'),
    );
  });

  it('limit aşımında OVER uyarısı üretir', async () => {
    respondWith(usage(11));
    const result = await service.collectOne(tenant() as never);
    expect(result!.alerts[0]).toMatchObject({ dimension: 'users', level: 'OVER' });
  });

  it('container limiti panel lisansından farklıysa DRIFT uyarısı üretir', async () => {
    respondWith(usage(3, 1, 5)); // container KALEM_MAX_USERS=5, panel 10
    const result = await service.collectOne(tenant() as never);
    expect(result!.alerts).toEqual([
      { dimension: 'users', used: 3, limit: 10, level: 'DRIFT' },
    ]);
  });

  it('aynı uyarı seviyesi tekrarında e-posta YENİDEN gönderilmez', async () => {
    respondWith(usage(9));
    const t = tenant({
      lastUsage: { users: 9, fetchedAt: 'x', alerts: [{ dimension: 'users', used: 9, limit: 10, level: 'NEAR' }] },
    });
    const result = await service.collectOne(t as never);
    expect(result!.newAlerts).toHaveLength(0);
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('endpoint erişilemezse sessizce null döner (Kalem tarafı hazır değilken kırılmaz)', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await service.collectOne(tenant() as never)).toBeNull();
    expect(tenants.update).not.toHaveBeenCalled();
  });

  it('collect: ACTIVE tenant\'ları dolaşır ve özet döner', async () => {
    tenants.findBy.mockResolvedValue([tenant(), tenant({ id: 't2', slug: 'demo2' })]);
    respondWith(usage(9));
    const summary = await service.collect();
    expect(summary).toEqual({ collected: 2, alerted: 2 });
  });

  it('alerts: yalnız uyarısı olan tenant\'ları listeler', async () => {
    tenants.findBy.mockResolvedValue([
      tenant({ lastUsage: { alerts: [{ dimension: 'users', used: 11, limit: 10, level: 'OVER' }] } }),
      tenant({ id: 't2', lastUsage: { alerts: [] } }),
      tenant({ id: 't3', lastUsage: undefined }),
    ]);
    const list = await service.alerts();
    expect(list).toHaveLength(1);
    expect(list[0].alerts[0].level).toBe('OVER');
  });
});
