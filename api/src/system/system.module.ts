import { Module } from '@nestjs/common';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { SystemController } from './system.controller';

@Module({
  imports: [ProvisioningModule],
  controllers: [SystemController],
})
export class SystemModule {}
