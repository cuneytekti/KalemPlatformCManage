import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IsEnum, IsIn, IsOptional, Matches } from 'class-validator';
import { Tenant } from '../entities/tenant.entity';
import { Quote, QuoteStatus } from '../entities/quote.entity';
import { CreateQuoteDto } from './quote-input.dto';
import { QuotePdfService, QuoteLang } from './quote-pdf.service';
import { QuotesService } from './quotes.service';

export { CreateQuoteDto } from './quote-input.dto';

class SetStatusDto {
  @IsEnum(QuoteStatus)
  status: QuoteStatus;
}

class ConvertDto {
  @Matches(/^[a-z][a-z0-9-]{2,30}$/, {
    message: 'slug küçük harfle başlamalı; yalnız a-z, 0-9 ve tire (3-31 karakter)',
  })
  slug: string;
}

class SendDto {
  @IsOptional() @IsIn(['az', 'tr', 'en'])
  lang?: 'az' | 'tr' | 'en';
}

@Controller('quotes')
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly pdfService: QuotePdfService,
  ) {}

  @Get()
  findAll(): Promise<Quote[]> {
    return this.quotesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateQuoteDto): Promise<Quote> {
    return this.quotesService.create(dto);
  }

  @Get(':id/pdf')
  async pdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lang') lang: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const quote = await this.quotesService.findOne(id);
    const language: QuoteLang = lang === 'tr' || lang === 'en' ? lang : 'az';
    const pdf = await this.pdfService.renderPdf(quote, language);
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="teklif-${quote.id.slice(0, 8)}-${language}.pdf"`,
      })
      .send(pdf);
  }

  @Patch(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStatusDto): Promise<Quote> {
    return this.quotesService.setStatus(id, dto.status);
  }

  /** Teklif PDF'ini müşteriye e-postayla gönderir (SENT işaretler). */
  @Post(':id/send')
  send(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SendDto): Promise<Quote> {
    return this.quotesService.sendByEmail(id, dto.lang ?? 'az');
  }

  /** Teklifi tek tıkla tenant'a dönüştürür: kurulum + lisans + ACCEPTED. */
  @Post(':id/convert-to-tenant')
  convert(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ConvertDto): Promise<Tenant> {
    return this.quotesService.convertToTenant(id, dto.slug);
  }
}
