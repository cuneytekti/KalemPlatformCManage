import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfService } from '../common/pdf.service';
import { License } from '../entities/license.entity';
import { QuoteActivity } from '../entities/quote-activity.entity';
import { TenantsModule } from '../tenants/tenants.module';
import { Quote } from '../entities/quote.entity';
import { QuotePdfService } from './quote-pdf.service';
import { QuoteEmailService } from './quote-email.service';
import { QuotesController } from './quotes.controller';
import { QuotesService } from './quotes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Quote, QuoteActivity, License]), TenantsModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuotePdfService, QuoteEmailService, PdfService],
  exports: [QuotesService],
})
export class QuotesModule {}
