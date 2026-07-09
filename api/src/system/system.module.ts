import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { MailModule } from '../mail/mail.module';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { BackupService } from './backup.service';
import { HealthMonitorService } from './health-monitor.service';
import { SystemController } from './system.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant]), ProvisioningModule, MailModule],
  controllers: [SystemController],
  providers: [BackupService, HealthMonitorService],
})
export class SystemModule {}
