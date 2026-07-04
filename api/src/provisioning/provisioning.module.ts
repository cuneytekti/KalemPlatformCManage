import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from '../common/crypto.service';
import { ProvisioningJob } from '../entities/provisioning-job.entity';
import { Tenant } from '../entities/tenant.entity';
import { DbProvisionerService } from './db-provisioner.service';
import { DockerService } from './docker.service';
import { ProvisioningProcessor } from './provisioning.processor';
import { PROVISIONING_QUEUE, ProvisioningService } from './provisioning.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: PROVISIONING_QUEUE }),
    TypeOrmModule.forFeature([Tenant, ProvisioningJob]),
  ],
  providers: [ProvisioningService, ProvisioningProcessor, DockerService, DbProvisionerService, CryptoService],
  exports: [ProvisioningService, DockerService, DbProvisionerService],
})
export class ProvisioningModule {}
