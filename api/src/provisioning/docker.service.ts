import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Docker from 'dockerode';
import { CryptoService } from '../common/crypto.service';
import { Tenant } from '../entities/tenant.entity';

export interface TenantRuntimeConfig {
  dbPassword: string;
  jwtSecret: string;
}

/**
 * Docker Engine API sarmalayıcısı. Üretimde socket-proxy üzerinden konuşur;
 * yalnızca container/image/network endpoint'lerine erişimi vardır.
 */
@Injectable()
export class DockerService {
  private readonly docker: Docker;
  private readonly cfg: {
    baseDomain: string; apiImage: string; webImage: string; dbHost: string;
    edgeNetwork: string; apiMemoryMb: number; webMemoryMb: number;
  };

  constructor(config: ConfigService, private readonly crypto: CryptoService) {
    const hostUrl = config.get<string>('docker.hostUrl');
    if (hostUrl) {
      const url = new URL(hostUrl);
      this.docker = new Docker({ host: url.hostname, port: parseInt(url.port || '2375', 10) });
    } else {
      this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    }
    this.cfg = {
      baseDomain: config.get<string>('tenant.baseDomain')!,
      apiImage: config.get<string>('tenant.apiImage')!,
      webImage: config.get<string>('tenant.webImage')!,
      dbHost: config.get<string>('tenant.dbHost')!,
      edgeNetwork: config.get<string>('tenant.edgeNetwork')!,
      apiMemoryMb: config.get<number>('tenant.apiMemoryMb')!,
      webMemoryMb: config.get<number>('tenant.webMemoryMb')!,
    };
  }

  tenantHost(slug: string): string {
    return `${slug}.${this.cfg.baseDomain}`;
  }

  private tenantNetworkName(slug: string): string {
    return `kalem-tenant-${slug}`;
  }

  /** Tenant'a özel izole ağ (api ↔ web ↔ paylaşılan DB). */
  async ensureTenantNetwork(slug: string): Promise<string> {
    const name = this.tenantNetworkName(slug);
    const existing = await this.docker.listNetworks({ filters: { name: [name] } });
    if (existing.length === 0) {
      await this.docker.createNetwork({ Name: name, Driver: 'bridge' });
    }
    return name;
  }

  async pullImages(): Promise<void> {
    for (const image of [this.cfg.apiImage, this.cfg.webImage]) {
      const stream = await this.docker.pull(image);
      await new Promise((resolve, reject) =>
        this.docker.modem.followProgress(stream, (err) => (err ? reject(err) : resolve(null))),
      );
    }
  }

  /** Aynı isimde container varsa kaldırır (retry/reconfigure idempotentliği). */
  async removeContainerByName(name: string): Promise<void> {
    try {
      await this.docker.getContainer(name).remove({ force: true });
    } catch {
      /* yoksa sorun değil */
    }
  }

  /** kalem-api container'ı: yalnız tenant ağında, dışarı kapalı. */
  async runTenantApi(tenant: Tenant, runtime: TenantRuntimeConfig): Promise<string> {
    await this.removeContainerByName(`kalem-api-${tenant.slug}`);
    const net = this.tenantNetworkName(tenant.slug);
    const host = this.tenantHost(tenant.slug);
    const container = await this.docker.createContainer({
      name: `kalem-api-${tenant.slug}`,
      Image: this.cfg.apiImage,
      Env: [
        `KALEM_DB_URL=jdbc:postgresql://${this.cfg.dbHost}:5432/${tenant.dbName}`,
        `KALEM_DB_USERNAME=${tenant.dbUser}`,
        `KALEM_DB_PASSWORD=${runtime.dbPassword}`,
        `KALEM_JWT_SECRET=${runtime.jwtSecret}`,
        `KALEM_INTERNAL_TOKEN=${this.crypto.internalLicenseToken(runtime.jwtSecret)}`,
        `KALEM_CORS_ORIGINS=https://${host}`,
        'KALEM_COOKIE_SECURE=true',
        `KALEM_ERP_TYPE=${tenant.erpType}`,
        `KALEM_MAX_USERS=${tenant.licensedUsers}`,
        `KALEM_MAX_POS_TERMINALS=${tenant.licensedPosTerminals}`,
        `KALEM_MAX_MOBILE_TERMINALS=${tenant.licensedMobileTerminals}`,
        'TZ=Asia/Baku',
      ],
      Labels: { 'kalem.tenant': tenant.slug, 'kalem.role': 'api' },
      HostConfig: {
        RestartPolicy: { Name: 'unless-stopped' },
        Memory: this.cfg.apiMemoryMb * 1024 * 1024,
        NetworkMode: net,
      },
      NetworkingConfig: {
        // Backoffice nginx'i /api isteklerini bu alias üzerinden proxy'ler
        EndpointsConfig: { [net]: { Aliases: ['api', `kalem-api-${tenant.slug}`] } },
      },
    });
    // Paylaşılan PG sunucusuna erişim için tenants ağına da bağla
    await this.connectToNetwork(container.id, 'cmanage-tenants');
    await container.start();
    return container.id;
  }

  /** backoffice-web container'ı: Traefik etiketleriyle subdomain'e açılır. */
  async runTenantWeb(tenant: Tenant): Promise<string> {
    await this.removeContainerByName(`kalem-web-${tenant.slug}`);
    const net = this.tenantNetworkName(tenant.slug);
    const host = this.tenantHost(tenant.slug);
    const router = `t-${tenant.slug}`;
    const container = await this.docker.createContainer({
      name: `kalem-web-${tenant.slug}`,
      Image: this.cfg.webImage,
      Labels: {
        'kalem.tenant': tenant.slug,
        'kalem.role': 'web',
        'traefik.enable': 'true',
        [`traefik.http.routers.${router}.rule`]: `Host(\`${host}\`)`,
        [`traefik.http.routers.${router}.entrypoints`]: 'websecure',
        [`traefik.http.routers.${router}.tls.certresolver`]: 'letsencrypt',
        [`traefik.http.services.${router}.loadbalancer.server.port`]: '80',
        'traefik.docker.network': this.cfg.edgeNetwork,
      },
      HostConfig: {
        RestartPolicy: { Name: 'unless-stopped' },
        Memory: this.cfg.webMemoryMb * 1024 * 1024,
        NetworkMode: net,
      },
    });
    await this.connectToNetwork(container.id, this.cfg.edgeNetwork);
    await container.start();
    return container.id;
  }

  /**
   * Mobil terminal API'si (aynı kalem-api imajı, ayrı servis).
   * Yalnız licensedMobileTerminals > 0 olan tenant'larda kurulur;
   * el terminalleri https://<slug>-mt.<domain> üzerinden erişir.
   */
  async runTenantMobileApi(tenant: Tenant, runtime: TenantRuntimeConfig): Promise<string> {
    await this.removeContainerByName(`kalem-mt-${tenant.slug}`);
    const net = this.tenantNetworkName(tenant.slug);
    const host = `${tenant.slug}-mt.${this.cfg.baseDomain}`;
    const router = `mt-${tenant.slug}`;
    const container = await this.docker.createContainer({
      name: `kalem-mt-${tenant.slug}`,
      Image: this.cfg.apiImage,
      Env: [
        `KALEM_DB_URL=jdbc:postgresql://${this.cfg.dbHost}:5432/${tenant.dbName}`,
        `KALEM_DB_USERNAME=${tenant.dbUser}`,
        `KALEM_DB_PASSWORD=${runtime.dbPassword}`,
        `KALEM_JWT_SECRET=${runtime.jwtSecret}`,
        `KALEM_INTERNAL_TOKEN=${this.crypto.internalLicenseToken(runtime.jwtSecret)}`,
        `KALEM_CORS_ORIGINS=https://${host}`,
        'KALEM_COOKIE_SECURE=true',
        `KALEM_MAX_MOBILE_TERMINALS=${tenant.licensedMobileTerminals}`,
        'TZ=Asia/Baku',
      ],
      Labels: {
        'kalem.tenant': tenant.slug,
        'kalem.role': 'mobile-terminal',
        'traefik.enable': 'true',
        [`traefik.http.routers.${router}.rule`]: `Host(\`${host}\`)`,
        [`traefik.http.routers.${router}.entrypoints`]: 'websecure',
        [`traefik.http.routers.${router}.tls.certresolver`]: 'letsencrypt',
        [`traefik.http.services.${router}.loadbalancer.server.port`]: '8080',
        'traefik.docker.network': this.cfg.edgeNetwork,
      },
      HostConfig: {
        RestartPolicy: { Name: 'unless-stopped' },
        Memory: this.cfg.apiMemoryMb * 1024 * 1024,
        NetworkMode: net,
      },
    });
    await this.connectToNetwork(container.id, 'cmanage-tenants');
    await this.connectToNetwork(container.id, this.cfg.edgeNetwork);
    await container.start();
    return container.id;
  }

  private tenantContainerNames(slug: string): string[] {
    return [`kalem-web-${slug}`, `kalem-mt-${slug}`, `kalem-api-${slug}`];
  }

  async stopTenantStack(slug: string): Promise<void> {
    for (const name of this.tenantContainerNames(slug)) {
      try {
        await this.docker.getContainer(name).stop();
      } catch {
        /* çalışmıyor veya yok */
      }
    }
  }

  async startTenantStack(slug: string): Promise<void> {
    // api önce ayağa kalkmalı
    for (const name of [...this.tenantContainerNames(slug)].reverse()) {
      try {
        await this.docker.getContainer(name).start();
      } catch {
        /* zaten çalışıyor veya yok */
      }
    }
  }

  async removeTenantStackBySlug(slug: string): Promise<void> {
    for (const name of this.tenantContainerNames(slug)) {
      await this.removeContainerByName(name);
    }
  }

  /** Host özet metrikleri (dashboard) */
  async systemStats(): Promise<{
    containersRunning: number;
    containersTotal: number;
    images: number;
    cpus: number;
    memTotalMb: number;
    kalemContainers: { name: string; tenant: string; role: string; state: string }[];
  }> {
    const info = await this.docker.info();
    const list = await this.docker.listContainers({
      all: true,
      filters: { label: ['kalem.tenant'] },
    });
    return {
      containersRunning: info.ContainersRunning,
      containersTotal: info.Containers,
      images: info.Images,
      cpus: info.NCPU,
      memTotalMb: Math.round(info.MemTotal / 1024 / 1024),
      kalemContainers: list.map((c) => ({
        name: (c.Names?.[0] ?? '').replace(/^\//, ''),
        tenant: c.Labels['kalem.tenant'],
        role: c.Labels['kalem.role'],
        state: c.State,
      })),
    };
  }

  private async connectToNetwork(containerId: string, networkName: string): Promise<void> {
    await this.docker.getNetwork(networkName).connect({ Container: containerId });
  }

  /** Container healthcheck'i 'healthy' olana dek bekler. */
  async waitHealthy(containerId: string, timeoutMs = 180_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    const container = this.docker.getContainer(containerId);
    for (;;) {
      const info = await container.inspect();
      const health = info.State.Health?.Status ?? (info.State.Running ? 'healthy' : 'starting');
      if (health === 'healthy') return;
      if (health === 'unhealthy') throw new Error('Container unhealthy durumda');
      if (Date.now() > deadline) throw new Error('Healthcheck zaman aşımı');
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  async removeTenantStack(tenant: Tenant): Promise<void> {
    for (const id of [tenant.webContainerId, tenant.apiContainerId]) {
      if (!id) continue;
      try {
        await this.docker.getContainer(id).remove({ force: true });
      } catch {
        /* zaten silinmiş olabilir */
      }
    }
  }
}
