import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesModule } from '../invoices/invoices.module';
import { License } from '../entities/license.entity';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';

@Module({
  imports: [TypeOrmModule.forFeature([License]), InvoicesModule],
  controllers: [LicensesController],
  providers: [LicensesService],
})
export class LicensesModule {}
