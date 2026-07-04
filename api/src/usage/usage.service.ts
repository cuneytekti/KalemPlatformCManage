import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../entities/tenant.entity';

/**
 * Her saat ACTIVE tenant'lardan kullanım sayaçlarını çeker.
 * Kalem API tarafındaki /internal/license endpoint'i Faz 2'nin Kalem
 * ayağında eklenecek; endpoint hazır olana dek hatalar sessizce loglanır.
 * Panel, tenant api container'ına paylaşılan cmanage-tenants ağı
 * üzerinden container adıyla erişir.
 */
@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(@InjectRepository(Tenant) private readonly tenants: Repository<Tenant>) {}

  @Cron(CronExpression.EVERY_HOUR)
  async collect(): Promise<void> {
    const active = await this.tenants.findBy({ status: TenantStatus.ACTIVE });
    for (const tenant of active) {
      try {
        const res = await fetch(`http://kalem-api-${tenant.slug}:8080/internal/license`, {
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) continue;
        const body = (await res.json()) as {
          users?: number; posTerminals?: number; mobileTerminals?: number;
        };
        await this.tenants.update(tenant.id, {
          lastUsage: { ...body, fetchedAt: new Date().toISOString() },
        });
      } catch (err) {
        this.logger.debug(`Usage alınamadı (${tenant.slug}): ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}
