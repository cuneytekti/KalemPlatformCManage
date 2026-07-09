import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../entities/tenant.entity';
import { MailService } from '../mail/mail.service';
import { DockerService } from '../provisioning/docker.service';

export interface HealthAlert {
  tenant: string;
  container: string;
  state: string;
  since: string;
}

/**
 * ACTIVE tenant container'larını 5 dakikada bir denetler.
 * Beklenen container (api, web, mobil lisans >0 ise mt) çalışmıyorsa
 * admin'e e-posta gönderir; aynı arıza için tekrar göndermez, düzelince
 * kayıt temizlenir ve toparlanma e-postası gider.
 */
@Injectable()
export class HealthMonitorService {
  private readonly logger = new Logger(HealthMonitorService.name);
  /** container adı → ilk arıza zamanı (tekrarlı uyarı önleme) */
  private readonly down = new Map<string, string>();

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly docker: DockerService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /** Panel için aktif arızalar. */
  alerts(): HealthAlert[] {
    return [...this.down.entries()].map(([key, since]) => {
      const [tenant, container, state] = key.split('|');
      return { tenant, container, state, since };
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async check(): Promise<void> {
    let stats: Awaited<ReturnType<DockerService['systemStats']>>;
    try {
      stats = await this.docker.systemStats();
    } catch (err) {
      this.logger.debug(`Docker erişilemedi: ${err instanceof Error ? err.message : err}`);
      return;
    }
    const active = await this.tenants.findBy({ status: TenantStatus.ACTIVE });
    const byName = new Map(stats.kalemContainers.map((c) => [c.name, c.state]));
    const failures: HealthAlert[] = [];
    const recovered: string[] = [];
    const seen = new Set<string>();

    for (const tenant of active) {
      const expected = [`kalem-api-${tenant.slug}`, `kalem-web-${tenant.slug}`];
      if (tenant.licensedMobileTerminals > 0) expected.push(`kalem-mt-${tenant.slug}`);
      for (const name of expected) {
        const state = byName.get(name) ?? 'missing';
        const healthy = state === 'running';
        const existingKey = [...this.down.keys()].find((k) => k.startsWith(`${tenant.slug}|${name}|`));
        if (!healthy) {
          const key = `${tenant.slug}|${name}|${state}`;
          seen.add(key);
          if (!existingKey) {
            const since = new Date().toISOString();
            this.down.set(key, since);
            failures.push({ tenant: tenant.slug, container: name, state, since });
          }
        } else if (existingKey) {
          this.down.delete(existingKey);
          recovered.push(name);
        }
      }
    }
    // ACTIVE olmaktan çıkan tenant'ların eski kayıtlarını temizle
    for (const key of [...this.down.keys()]) {
      const slug = key.split('|')[0];
      if (!active.some((t) => t.slug === slug) && !seen.has(key)) this.down.delete(key);
    }

    if (failures.length > 0) {
      this.logger.warn(`Arızalı container: ${failures.map((f) => `${f.container} (${f.state})`).join(', ')}`);
      void this.mail.send(
        this.config.get<string>('admin.email')!,
        `⚠ Container arızası: ${failures.map((f) => f.tenant).join(', ')}`,
        failures.map((f) => `- ${f.container}: ${f.state} (tenant: ${f.tenant})`).join('\n') +
          `\n\nPanel: https://panel.${this.config.get<string>('tenant.baseDomain')}/`,
      );
    }
    if (recovered.length > 0) {
      this.logger.log(`Toparlandı: ${recovered.join(', ')}`);
      void this.mail.send(
        this.config.get<string>('admin.email')!,
        `✓ Toparlandı: ${recovered.join(', ')}`,
        `Aşağıdaki container'lar yeniden çalışıyor:\n${recovered.map((n) => `- ${n}`).join('\n')}`,
      );
    }
  }
}
