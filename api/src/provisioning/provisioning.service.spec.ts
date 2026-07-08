import { firstValueFrom } from 'rxjs';
import { JobStatus } from '../entities/provisioning-job.entity';
import { ProvisioningService } from './provisioning.service';

/** Kuyruk + SSE log akışı smoke testleri (BullMQ ve repo mock'lu). */
describe('ProvisioningService', () => {
  let service: ProvisioningService;
  let queue: { add: jest.Mock };
  let jobs: { create: jest.Mock; save: jest.Mock; update: jest.Mock; find: jest.Mock };

  beforeEach(() => {
    queue = { add: jest.fn() };
    jobs = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'job1', ...x })),
      update: jest.fn(),
      find: jest.fn(),
    };
    service = new ProvisioningService(queue as never, jobs as never);
  });

  it('enqueue: QUEUED job kaydeder ve provision-tenant işini kuyruğa ekler', async () => {
    const job = await service.enqueue('t1');
    expect(job.status).toBe(JobStatus.QUEUED);
    expect(queue.add).toHaveBeenCalledWith(
      'provision-tenant',
      { tenantId: 't1', jobId: 'job1' },
      expect.objectContaining({ attempts: 1, removeOnFail: false }),
    );
  });

  it('enqueueReconfigure: reconfigure-tenant işini kuyruğa ekler', async () => {
    await service.enqueueReconfigure('t1');
    expect(queue.add).toHaveBeenCalledWith(
      'reconfigure-tenant',
      { tenantId: 't1', jobId: 'job1' },
      expect.anything(),
    );
  });

  it('log: satırı DB güncellemesine ve açık SSE akışına yazar', async () => {
    const stream = service.stream('t1');
    const next = firstValueFrom(stream);
    await service.log('job1', 't1', "Container 'demo' oluşturuluyor");
    expect(jobs.update).toHaveBeenCalledWith(
      'job1',
      expect.objectContaining({ currentStep: "Container 'demo' oluşturuluyor" }),
    );
    const event = await next;
    expect(String(event.data)).toContain("Container 'demo' oluşturuluyor");
  });

  it('log: SQL tek tırnak kaçışı yapılır (injection koruması)', async () => {
    await service.log('job1', 't1', "adim'lar");
    const updateArg = jobs.update.mock.calls[0][1] as { logs: () => string };
    expect(updateArg.logs()).toContain("adim''lar");
  });

  it('closeStream: akışı tamamlar ve haritadan düşürür', async () => {
    const stream = service.stream('t1');
    const completed = new Promise<void>((res) => stream.subscribe({ complete: res }));
    service.closeStream('t1');
    await completed;
    // yeni stream çağrısı taze bir Subject üretmeli (hata fırlatmamalı)
    expect(() => service.stream('t1')).not.toThrow();
  });
});
