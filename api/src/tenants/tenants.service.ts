import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../entities/tenant.entity';
import { MailService } from '../mail/mail.service';
import { DbProvisionerService } from '../provisioning/db-provisioner.service';
import { DockerService } from '../provisioning/docker.service';
import { ProvisioningService } from '../provisioning/provisioning.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

/** Traefik/Docker ile çakışmaması gereken ayrılmış subdomain'ler */
const RESERVED_SLUGS = ['panel', 'www', 'api', 'traefik', 'db', 'redis'];

export interface UpdateLicenseInput {
  licensedUsers: number;
  licensedPosTerminals: number;
  licensedMobileTerminals: number;
  /** 'now' (varsayılan) hemen uygular; 'night' bir sonraki 03:00 Bakü'ye zamanlar. */
  applyAt?: 'now' | 'night';
}

/** Bakü UTC+4 (DST yok). Bir sonraki 03:00 Bakü'ye kalan süre (ms). */
export function msUntilNextBakuNight(now: Date = new Date()): number {
  const BAKU_OFFSET_MS = 4 * 3_600_000;
  const NIGHT_HOUR = 3;
  const baku = new Date(now.getTime() + BAKU_OFFSET_MS);
  const target = Date.UTC(baku.getUTCFullYear(), baku.getUTCMonth(), baku.getUTCDate(), NIGHT_HOUR);
  const targetUtc = target - BAKU_OFFSET_MS;
  const next = targetUtc > now.getTime() ? targetUtc : targetUtc + 86_400_000;
  return next - now.getTime();
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly provisioning: ProvisioningService,
    private readonly docker: DockerService,
    private readonly dbProvisioner: DbProvisionerService,
    private readonly mail: MailService,
  ) {}

  findAll(): Promise<Tenant[]> {
    return this.tenants.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenants.findOneBy({ id });
    if (!tenant) throw new NotFoundException('Tenant bulunamadı');
    return tenant;
  }

  /** Müşteri kaydını oluşturur ve kurulum işini kuyruğa alır. */
  async createAndProvision(dto: CreateTenantDto): Promise<Tenant> {
    if (RESERVED_SLUGS.includes(dto.slug)) {
      throw new ConflictException(`'${dto.slug}' ayrılmış bir subdomain`);
    }
    const existing = await this.tenants.findOneBy({ slug: dto.slug });
    if (existing) throw new ConflictException(`'${dto.slug}' zaten kullanımda`);

    const tenant = await this.tenants.save(
      this.tenants.create({ ...dto, status: TenantStatus.PENDING }),
    );
    await this.provisioning.enqueue(tenant.id);
    return tenant;
  }

  /** FAILED kurulumun yeniden denenmesi (saga adımları idempotent). */
  async retry(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    if (tenant.status !== TenantStatus.FAILED) {
      throw new BadRequestException('Yalnız FAILED durumundaki tenant yeniden denenebilir');
    }
    tenant.status = TenantStatus.PENDING;
    await this.tenants.save(tenant);
    await this.provisioning.enqueue(tenant.id);
    return tenant;
  }

  async suspend(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new BadRequestException('Yalnız ACTIVE tenant askıya alınabilir');
    }
    await this.docker.stopTenantStack(tenant.slug);
    tenant.status = TenantStatus.SUSPENDED;
    return this.tenants.save(tenant);
  }

  async resume(id: string): Promise<Tenant> {
    const tenant = await this.findOne(id);
    if (tenant.status !== TenantStatus.SUSPENDED) {
      throw new BadRequestException('Yalnız SUSPENDED tenant devam ettirilebilir');
    }
    await this.docker.startTenantStack(tenant.slug);
    tenant.status = TenantStatus.ACTIVE;
    return this.tenants.save(tenant);
  }

  /**
   * Tenant'ı kaldırır: container'lar silinir; dropDatabase=true ise DB de düşer.
   * Kayıt DELETED olarak saklanır (denetim izi).
   */
  async remove(id: string, dropDatabase: boolean): Promise<Tenant> {
    const tenant = await this.findOne(id);
    await this.docker.removeTenantStackBySlug(tenant.slug);
    if (dropDatabase) {
      await this.dbProvisioner.dropTenantDatabase(tenant.slug);
    }
    tenant.status = TenantStatus.DELETED;
    return this.tenants.save(tenant);
  }

  /**
   * Lisans boyutlarını günceller ve container'ları yeni ENV'lerle yeniden
   * oluşturur. applyAt='night' ise reconfigure bir sonraki 03:00 Bakü'ye
   * zamanlanır (kısa kesinti gece penceresinde olur) ve müşteri bilgilendirilir.
   */
  async updateLicense(id: string, input: UpdateLicenseInput): Promise<Tenant> {
    const tenant = await this.findOne(id);
    if (tenant.status !== TenantStatus.ACTIVE && tenant.status !== TenantStatus.SUSPENDED) {
      throw new BadRequestException('Lisans yalnız ACTIVE/SUSPENDED tenant için güncellenebilir');
    }
    tenant.licensedUsers = input.licensedUsers;
    tenant.licensedPosTerminals = input.licensedPosTerminals;
    tenant.licensedMobileTerminals = input.licensedMobileTerminals;
    await this.tenants.save(tenant);

    const night = input.applyAt === 'night';
    const delayMs = night ? msUntilNextBakuNight() : 0;
    await this.provisioning.enqueueReconfigure(tenant.id, { delayMs });

    if (tenant.contactEmail) {
      const when = night
        ? `bu gece 03:00 (Bakü) civarında`
        : `birkaç dakika içinde`;
      void this.mail.send(
        tenant.contactEmail,
        'Kalem Platform — Lisans güncellemesi',
        `Sayın ${tenant.name},

Lisansınız güncellendi: ${input.licensedUsers} kullanıcı, ${input.licensedPosTerminals} POS kasa, ${input.licensedMobileTerminals} mobil terminal.

Değişikliğin uygulanması sırasında ${when} kısa bir hizmet kesintisi (1-2 dk) yaşanabilir.

Kalem Yazılım · 012 526 22 22 · info@kalemyazilim.az`,
      );
    }
    return tenant;
  }
}
