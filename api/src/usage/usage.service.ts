import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoService } from '../common/crypto.service';
import { Tenant, TenantStatus } from '../entities/tenant.entity';
import { MailService } from '../mail/mail.service';

/** Kalem API /internal/license yanıtı (docs/INTERNAL_LICENSE_API.md). */
export interface LicenseUsageResponse {
  users: { used: number; limit: number };
  posTerminals: { used: number; limit: number };
  mobileTerminals: { used: number; limit: number };
}

export type AlertLevel = 'NEAR' | 'OVER' | 'DRIFT';

export interface UsageAlert {
  dimension: 'users' | 'posTerminals' | 'mobileTerminals';
  used: number;
  limit: number;
  level: AlertLevel;
}

/** Yaklaşım eşiği: kullanım lisansın bu oranına ulaşınca NEAR uyarısı. */
const NEAR_THRESHOLD = 0.9;

/**
 * Her saat ACTIVE tenant'lardan kullanım sayaçlarını çeker
 * (GET /internal/license, panel→tenant HMAC servis token'ı ile).
 * Limit aşımı/yaklaşımı uyarıları tenant.lastUsage.alerts'e yazılır;
 * yeni bir uyarı seviyesi oluştuğunda admin'e e-posta gönderilir.
 */
@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly crypto: CryptoService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async collect(): Promise<{ collected: number; alerted: number }> {
    const active = await this.tenants.findBy({ status: TenantStatus.ACTIVE });
    let collected = 0;
    let alerted = 0;
    for (const tenant of active) {
      const result = await this.collectOne(tenant);
      if (result) {
        collected++;
        if (result.newAlerts.length > 0) alerted++;
      }
    }
    if (collected > 0) this.logger.log(`Kullanım toplandı: ${collected} tenant, ${alerted} yeni uyarı`);
    return { collected, alerted };
  }

  /** Tek tenant'tan kullanım çeker; yeni uyarılar için admin'i e-postalar. */
  async collectOne(tenant: Tenant): Promise<{ alerts: UsageAlert[]; newAlerts: UsageAlert[] } | null> {
    if (!tenant.jwtSecretEnc) return null;
    let body: LicenseUsageResponse;
    try {
      const token = this.crypto.internalLicenseToken(this.crypto.decrypt(tenant.jwtSecretEnc));
      const res = await fetch(`http://kalem-api-${tenant.slug}:8080/internal/license`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.debug(`Usage alınamadı (${tenant.slug}): HTTP ${res.status}`);
        return null;
      }
      body = (await res.json()) as LicenseUsageResponse;
    } catch (err) {
      this.logger.debug(`Usage alınamadı (${tenant.slug}): ${err instanceof Error ? err.message : err}`);
      return null;
    }

    const alerts = this.computeAlerts(tenant, body);
    const previous = new Set(
      (tenant.lastUsage?.alerts ?? []).map((a) => `${a.dimension}:${a.level}`),
    );
    const newAlerts = alerts.filter((a) => !previous.has(`${a.dimension}:${a.level}`));

    await this.tenants.update(tenant.id, {
      lastUsage: {
        users: body.users?.used,
        posTerminals: body.posTerminals?.used,
        mobileTerminals: body.mobileTerminals?.used,
        fetchedAt: new Date().toISOString(),
        alerts,
      },
    });

    if (newAlerts.length > 0) {
      this.logger.warn(
        `Lisans uyarısı (${tenant.slug}): ${newAlerts.map((a) => `${a.dimension} ${a.used}/${a.limit} ${a.level}`).join(', ')}`,
      );
      void this.mail.send(
        this.config.get<string>('admin.email')!,
        `Lisans uyarısı: ${tenant.name}`,
        `${tenant.slug}.${this.config.get<string>('tenant.baseDomain')} için lisans uyarıları:\n\n` +
          newAlerts
            .map((a) => {
              const dim = { users: 'Kullanıcı', posTerminals: 'POS kasa', mobileTerminals: 'Mobil terminal' }[a.dimension];
              const msg = {
                NEAR: 'limite yaklaştı',
                OVER: 'limiti aştı',
                DRIFT: 'container limiti panel lisansından farklı (reconfigure gerekli)',
              }[a.level];
              return `- ${dim}: ${a.used}/${a.limit} — ${msg}`;
            })
            .join('\n') +
          `\n\nPanel: https://panel.${this.config.get<string>('tenant.baseDomain')}/tenants`,
      );
    }
    return { alerts, newAlerts };
  }

  /**
   * NEAR: kullanım lisansın %90'ına ulaştı · OVER: lisansı aştı ·
   * DRIFT: Kalem container'ının bildiği limit panel lisansından farklı
   * (lisans değişmiş ama container henüz reconfigure edilmemiş).
   */
  private computeAlerts(tenant: Tenant, usage: LicenseUsageResponse): UsageAlert[] {
    const dims = [
      { dimension: 'users' as const, licensed: tenant.licensedUsers, u: usage.users },
      { dimension: 'posTerminals' as const, licensed: tenant.licensedPosTerminals, u: usage.posTerminals },
      { dimension: 'mobileTerminals' as const, licensed: tenant.licensedMobileTerminals, u: usage.mobileTerminals },
    ];
    const alerts: UsageAlert[] = [];
    for (const { dimension, licensed, u } of dims) {
      if (!u || licensed <= 0) continue;
      if (typeof u.limit === 'number' && u.limit !== licensed) {
        alerts.push({ dimension, used: u.used, limit: licensed, level: 'DRIFT' });
      }
      if (u.used >= licensed) {
        alerts.push({ dimension, used: u.used, limit: licensed, level: 'OVER' });
      } else if (u.used >= licensed * NEAR_THRESHOLD) {
        alerts.push({ dimension, used: u.used, limit: licensed, level: 'NEAR' });
      }
    }
    return alerts;
  }

  /** Panel dashboard'u için: uyarısı olan ACTIVE tenant'lar. */
  async alerts(): Promise<
    Array<{ tenantId: string; slug: string; name: string; fetchedAt?: string; alerts: UsageAlert[] }>
  > {
    const active = await this.tenants.findBy({ status: TenantStatus.ACTIVE });
    return active
      .filter((t) => (t.lastUsage?.alerts?.length ?? 0) > 0)
      .map((t) => ({
        tenantId: t.id,
        slug: t.slug,
        name: t.name,
        fetchedAt: t.lastUsage?.fetchedAt,
        alerts: t.lastUsage!.alerts!,
      }));
  }
}
