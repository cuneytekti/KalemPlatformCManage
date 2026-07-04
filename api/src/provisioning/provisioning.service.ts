import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, MessageEvent } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Observable, Subject, map } from 'rxjs';
import { Repository } from 'typeorm';
import { JobStatus, ProvisioningJob } from '../entities/provisioning-job.entity';

export const PROVISIONING_QUEUE = 'provisioning';

@Injectable()
export class ProvisioningService {
  /** tenantId → canlı log akışı */
  private readonly streams = new Map<string, Subject<string>>();

  constructor(
    @InjectQueue(PROVISIONING_QUEUE) private readonly queue: Queue,
    @InjectRepository(ProvisioningJob) private readonly jobs: Repository<ProvisioningJob>,
  ) {}

  async enqueue(tenantId: string): Promise<ProvisioningJob> {
    const job = await this.jobs.save(
      this.jobs.create({ tenantId, status: JobStatus.QUEUED }),
    );
    await this.queue.add('provision-tenant', { tenantId, jobId: job.id }, {
      attempts: 1, // Saga adımları kendi içinde idempotent; kör tekrar yerine kontrollü yeniden dene
      removeOnComplete: 100,
      removeOnFail: false,
    });
    return job;
  }

  async enqueueReconfigure(tenantId: string): Promise<ProvisioningJob> {
    const job = await this.jobs.save(
      this.jobs.create({ tenantId, status: JobStatus.QUEUED }),
    );
    await this.queue.add('reconfigure-tenant', { tenantId, jobId: job.id }, {
      attempts: 1,
      removeOnComplete: 100,
      removeOnFail: false,
    });
    return job;
  }

  /** Processor'dan çağrılır: logu hem DB'ye yazar hem SSE'ye yayınlar. */
  async log(jobId: string, tenantId: string, line: string): Promise<void> {
    const stamped = `[${new Date().toISOString()}] ${line}`;
    await this.jobs.update(jobId, {
      logs: () => `logs || '${stamped.replace(/'/g, "''")}\n'`,
      currentStep: line.slice(0, 250),
    });
    this.streams.get(tenantId)?.next(stamped);
  }

  stream(tenantId: string): Observable<MessageEvent> {
    let subject = this.streams.get(tenantId);
    if (!subject) {
      subject = new Subject<string>();
      this.streams.set(tenantId, subject);
    }
    return subject.pipe(map((line): MessageEvent => ({ data: line })));
  }

  closeStream(tenantId: string): void {
    this.streams.get(tenantId)?.complete();
    this.streams.delete(tenantId);
  }

  findJobsForTenant(tenantId: string): Promise<ProvisioningJob[]> {
    return this.jobs.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }
}
