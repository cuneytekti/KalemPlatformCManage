import { TenantStatus } from '../entities/tenant.entity';
import { HealthMonitorService } from './health-monitor.service';

describe('HealthMonitorService', () => {
  let service: HealthMonitorService;
  let tenants: { findBy: jest.Mock };
  let docker: { systemStats: jest.Mock };
  let mail: { send: jest.Mock };

  const tenant = (slug: string, mobile = 0) => ({
    slug, status: TenantStatus.ACTIVE, licensedMobileTerminals: mobile,
  });
  const containers = (entries: Array<[string, string]>) => ({
    containersRunning: 0, containersTotal: 0, images: 0, cpus: 0, memTotalMb: 0,
    kalemContainers: entries.map(([name, state]) => ({ name, tenant: 'x', role: 'x', state })),
  });

  beforeEach(() => {
    tenants = { findBy: jest.fn() };
    docker = { systemStats: jest.fn() };
    mail = { send: jest.fn(async () => true) };
    service = new HealthMonitorService(
      tenants as never,
      docker as never,
      mail as never,
      { get: jest.fn(() => 'admin@kalemplatform.com') } as never,
    );
  });

  it('düşen container için admin\'e e-posta gönderir', async () => {
    tenants.findBy.mockResolvedValue([tenant('demo')]);
    docker.systemStats.mockResolvedValue(
      containers([['kalem-api-demo', 'exited'], ['kalem-web-demo', 'running']]),
    );
    await service.check();
    expect(mail.send).toHaveBeenCalledWith(
      'admin@kalemplatform.com',
      expect.stringContaining('Container arızası'),
      expect.stringContaining('kalem-api-demo'),
    );
    expect(service.alerts()).toHaveLength(1);
  });

  it('aynı arıza için ikinci kontrolde tekrar e-posta göndermez', async () => {
    tenants.findBy.mockResolvedValue([tenant('demo')]);
    docker.systemStats.mockResolvedValue(
      containers([['kalem-api-demo', 'exited'], ['kalem-web-demo', 'running']]),
    );
    await service.check();
    await service.check();
    expect(mail.send).toHaveBeenCalledTimes(1);
  });

  it('toparlanınca kaydı temizler ve toparlanma e-postası gönderir', async () => {
    tenants.findBy.mockResolvedValue([tenant('demo')]);
    docker.systemStats.mockResolvedValueOnce(
      containers([['kalem-api-demo', 'exited'], ['kalem-web-demo', 'running']]),
    );
    await service.check();
    docker.systemStats.mockResolvedValueOnce(
      containers([['kalem-api-demo', 'running'], ['kalem-web-demo', 'running']]),
    );
    await service.check();
    expect(service.alerts()).toHaveLength(0);
    expect(mail.send).toHaveBeenLastCalledWith(
      'admin@kalemplatform.com',
      expect.stringContaining('Toparlandı'),
      expect.stringContaining('kalem-api-demo'),
    );
  });

  it('mobil lisansı olmayan tenant için mt container\'ı beklenmez; eksik container "missing" sayılır', async () => {
    tenants.findBy.mockResolvedValue([tenant('demo'), tenant('mobilci', 2)]);
    docker.systemStats.mockResolvedValue(
      containers([
        ['kalem-api-demo', 'running'], ['kalem-web-demo', 'running'],
        ['kalem-api-mobilci', 'running'], ['kalem-web-mobilci', 'running'],
        // kalem-mt-mobilci hiç yok → missing
      ]),
    );
    await service.check();
    const alerts = service.alerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].container).toBe('kalem-mt-mobilci');
    expect(alerts[0].state).toBe('missing');
  });

  it('Docker erişilemezse sessizce geçer (uyarı fırtınası yok)', async () => {
    docker.systemStats.mockRejectedValue(new Error('socket yok'));
    await service.check();
    expect(mail.send).not.toHaveBeenCalled();
  });
});
