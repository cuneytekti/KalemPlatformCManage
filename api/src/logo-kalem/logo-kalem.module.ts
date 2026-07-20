import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfService } from '../common/pdf.service';
import { LogoKalemCatalogItem } from '../entities/logo-kalem-catalog-item.entity';
import { LogoKalemQuoteActivity } from '../entities/logo-kalem-quote-activity.entity';
import { LogoKalemQuoteAdjustment } from '../entities/logo-kalem-quote-adjustment.entity';
import { LogoKalemQuoteLine } from '../entities/logo-kalem-quote-line.entity';
import { LogoKalemQuoteRevision } from '../entities/logo-kalem-quote-revision.entity';
import { LogoKalemQuoteSection } from '../entities/logo-kalem-quote-section.entity';
import { LogoKalemQuote } from '../entities/logo-kalem-quote.entity';
import { LogoKalemCatalogController, LogoKalemController } from './logo-kalem.controller';
import { LogoKalemPdfService } from './logo-kalem-pdf.service';
import { LogoKalemService } from './logo-kalem.service';

@Module({
  imports: [TypeOrmModule.forFeature([LogoKalemQuote, LogoKalemQuoteRevision, LogoKalemQuoteSection, LogoKalemQuoteLine, LogoKalemQuoteAdjustment, LogoKalemQuoteActivity, LogoKalemCatalogItem])],
  controllers: [LogoKalemController, LogoKalemCatalogController],
  providers: [LogoKalemService, LogoKalemPdfService, PdfService],
})
export class LogoKalemModule {}
