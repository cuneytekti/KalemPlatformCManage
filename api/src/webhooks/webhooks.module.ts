import { Module } from '@nestjs/common';
import { TenantsModule } from '../tenants/tenants.module';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [TenantsModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
