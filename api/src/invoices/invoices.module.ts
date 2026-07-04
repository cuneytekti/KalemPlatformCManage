import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../entities/invoice.entity';
import { License } from '../entities/license.entity';
import { Tenant } from '../entities/tenant.entity';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Tenant, License])],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
