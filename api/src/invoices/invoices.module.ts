import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../entities/invoice.entity';
import { License } from '../entities/license.entity';
import { PdfService } from '../common/pdf.service';
import { Tenant } from '../entities/tenant.entity';
import { ProvisioningModule } from '../provisioning/provisioning.module';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, Tenant, License]), ProvisioningModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicePdfService, PdfService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
