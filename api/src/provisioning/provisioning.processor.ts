import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { CryptoService } from '../common/crypto.service';
import { JobStatus, ProvisioningJob } from '../entities/provisioning-job.entity';
import { Tenant, TenantStatus } from '../entities/tenant.entity';
import { DbProvisionerService } from './db-provisioner.service';
import { DockerService, TenantRuntimeConfig } from './docker.service';
import { PROVISIONING_QUEUE, ProvisioningService } from './provisioning.service';

interface JobPayload {
  tenantId: string;
  jobId: string;
}

/**
 * provision-tenant: DB → imaj → ağ → api (+mobil) → web → ACTIVE
 * reconfigure-tenant: sırları çöz → api (+mobil) container'ı yeni ENV ile yeniden oluştur
 * Adımlar idempotent: retry'da var olan container/DB yeniden kullanılır veya değiştirilir.
 */
@Processor(PROVISIONING_QUEUE)
export class ProvisioningProcessor extends WorkerHost {
  private readonly logger = new Logger(ProvisioningProcessor.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(ProvisioningJob) private readonly jobs: Repository<ProvisioningJob>,
    private readonly docker: DockerService,
    private readonly dbProvisioner: DbProvisionerService,
    private readonly provisioning: ProvisioningService,
    private readonly crypto: CryptoService,
  ) {
    super();
  }

  async process(job: Job<JobPayload>): Promise<void> {
    const { tenantId, jobId } = job.data;
    const tenant = await this.tenants
      .createQueryBuilder('t')
      .addSelect(['t.dbPasswordEnc', 't.jwtSecretEnc'])
      .where('t.id = :id', { id: tenantId })
      .getOne();
    if (!tenant) throw new Error(`Tenant ${tenantId} bulunamadı`);

    const log = (line: string) => this.provisioning.log(jobId, tenantId, line);
    await this.jobs.update(jobId, { status: JobStatus.RUNNING });

    try {
      if (job.name === 'reconfigure-tenant') {
        await this.reconfigure(tenant, log);
      } else {
        await this.provision(tenant, log);
      }
      await this.jobs.update(jobId, { status: JobStatus.COMPLETED });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Tenant ${tenant.slug} işi başarısız: ${message}`);
      await log(`HATA: ${message}`);
      await this.tenants.update(tenantId, { status: TenantStatus.FAILED });
      await this.jobs.update(jobId, { status: JobStatus.FAILED, error: message });
      throw err;
    } finally {
      this.provisioning.closeStream(tenantId);
    }
  }

  private async provision(tenant: Tenant, log: (l: string) => Promise<void>): Promise<void> {
    await this.tenants.update(tenant.id, { status: TenantStatus.PROVISIONING });
    await log(`Kurulum başladı: ${tenant.slug} → ${this.docker.tenantHost(tenant.slug)}`);

    await log('1/6 Tenant veritabanı oluşturuluyor...');
    const creds = await this.dbProvisioner.createTenantDatabase(tenant.slug);
    const runtime: TenantRuntimeConfig = {
      dbPassword: creds.dbPassword,
      jwtSecret: randomBytes(48).toString('base64'),
    };
    tenant.dbName = creds.dbName;
    tenant.dbUser = creds.dbUser;
    tenant.dbPasswordEnc = this.crypto.encrypt(runtime.dbPassword);
    tenant.jwtSecretEnc = this.crypto.encrypt(runtime.jwtSecret);
    await this.tenants.save(tenant);

    await log('2/6 İmajlar çekiliyor...');
    await this.docker.pullImages();

    await log('3/6 Tenant ağı hazırlanıyor...');
    await this.docker.ensureTenantNetwork(tenant.slug);

    await log('4/6 kalem-api container başlatılıyor (Flyway şemayı kuracak)...');
    tenant.apiContainerId = await this.docker.runTenantApi(tenant, runtime);
    await this.tenants.save(tenant);
    await this.docker.waitHealthy(tenant.apiContainerId);
    await log('    kalem-api healthy ✓');

    if (tenant.licensedMobileTerminals > 0) {
      await log(`4b/6 Mobil terminal API başlatılıyor (${tenant.licensedMobileTerminals} terminal lisansı)...`);
      tenant.mobileContainerId = await this.docker.runTenantMobileApi(tenant, runtime);
      await this.tenants.save(tenant);
    }

    await log('5/6 backoffice-web container başlatılıyor (Traefik rotası açılıyor)...');
    tenant.webContainerId = await this.docker.runTenantWeb(tenant);
    await this.tenants.save(tenant);

    await log('6/6 Aktivasyon...');
    tenant.status = TenantStatus.ACTIVE;
    await this.tenants.save(tenant);
    await log(`Kurulum tamamlandı ✓ https://${this.docker.tenantHost(tenant.slug)} (admin / Admin@123 — ilk girişte değiştirilmeli)`);
  }

  private async reconfigure(tenant: Tenant, log: (l: string) => Promise<void>): Promise<void> {
    if (!tenant.dbPasswordEnc || !tenant.jwtSecretEnc) {
      throw new Error('Tenant sırları kayıtlı değil; reconfigure yapılamaz (yeniden kurulum gerekir)');
    }
    const runtime: TenantRuntimeConfig = {
      dbPassword: this.crypto.decrypt(tenant.dbPasswordEnc),
      jwtSecret: this.crypto.decrypt(tenant.jwtSecretEnc),
    };

    await log(`Yeniden yapılandırma: ${tenant.slug} — kullanıcı=${tenant.licensedUsers}, kasa=${tenant.licensedPosTerminals}, mobil=${tenant.licensedMobileTerminals}`);

    await log('1/3 kalem-api yeni lisans ENV\'leriyle yeniden oluşturuluyor (kısa kesinti)...');
    tenant.apiContainerId = await this.docker.runTenantApi(tenant, runtime);
    await this.tenants.save(tenant);
    await this.docker.waitHealthy(tenant.apiContainerId);
    await log('    kalem-api healthy ✓');

    await log('2/3 Mobil terminal API güncelleniyor...');
    if (tenant.licensedMobileTerminals > 0) {
      tenant.mobileContainerId = await this.docker.runTenantMobileApi(tenant, runtime);
    } else if (tenant.mobileContainerId) {
      await this.docker.removeContainerByName(`kalem-mt-${tenant.slug}`);
      await this.tenants.update(tenant.id, { mobileContainerId: null as unknown as string });
      tenant.mobileContainerId = undefined;
    }
    await this.tenants.save(tenant);

    await log('3/3 Aktivasyon...');
    tenant.status = TenantStatus.ACTIVE;
    await this.tenants.save(tenant);
    await log('Yeniden yapılandırma tamamlandı ✓');
  }
}
