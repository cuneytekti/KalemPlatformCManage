import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../entities/order.entity';
import { Tenant } from '../entities/tenant.entity';
import { MailModule } from '../mail/mail.module';
import { TenantsModule } from '../tenants/tenants.module';
import { PashaEcommService } from './pasha-ecomm.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Tenant]), TenantsModule, MailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PashaEcommService],
})
export class PaymentsModule {}
