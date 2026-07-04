import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant, TenantStatus } from '../entities/tenant.entity';
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
}

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly provisioning: ProvisioningService,
    private readonly docker: DockerService,
    private readonly dbProvisioner: DbProvisionerService,
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

  /** Lisans boyutlarını günceller ve container'ları yeni ENV'lerle yeniden oluşturur. */
  async updateLicense(id: string, input: UpdateLicenseInput): Promise<Tenant> {
    const tenant = await this.findOne(id);
    if (tenant.status !== TenantStatus.ACTIVE && tenant.status !== TenantStatus.SUSPENDED) {
      throw new BadRequestException('Lisans yalnız ACTIVE/SUSPENDED tenant için güncellenebilir');
    }
    tenant.licensedUsers = input.licensedUsers;
    tenant.licensedPosTerminals = input.licensedPosTerminals;
    tenant.licensedMobileTerminals = input.licensedMobileTerminals;
    await this.tenants.save(tenant);
    await this.provisioning.enqueueReconfigure(tenant.id);
    return tenant;
  }
}
