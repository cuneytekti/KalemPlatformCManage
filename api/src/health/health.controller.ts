import { InjectQueue } from '@nestjs/bullmq';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DataSource } from 'typeorm';
import { Public } from '../auth/public.decorator';
import { PROVISIONING_QUEUE } from '../provisioning/provisioning.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @InjectQueue(PROVISIONING_QUEUE) private readonly queue: Queue,
  ) {}

  @Public()
  @Get()
  async check(): Promise<{ status: string; db: string; redis: string }> {
    const result = { status: 'ok', db: 'up', redis: 'up' };
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      result.db = 'down';
    }
    try {
      await (await this.queue.client).ping();
    } catch {
      result.redis = 'down';
    }
    if (result.db === 'down' || result.redis === 'down') {
      result.status = 'degraded';
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
