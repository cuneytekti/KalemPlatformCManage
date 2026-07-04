import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PROVISIONING_QUEUE } from '../provisioning/provisioning.service';
import { HealthController } from './health.controller';

@Module({
  imports: [BullModule.registerQueue({ name: PROVISIONING_QUEUE })],
  controllers: [HealthController],
})
export class HealthModule {}
