import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IsEmail, IsEnum, IsInt, IsNumberString, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Quote, QuoteStatus } from '../entities/quote.entity';
import { QuotePdfService, QuoteLang } from './quote-pdf.service';
import { QuotesService } from './quotes.service';

class CreateQuoteDto {
  @IsString() @MaxLength(120)
  customerName: string;

  @IsOptional() @IsEmail()
  contactEmail?: string;

  @IsInt() @Min(1) @Max(1000)
  seats: number;

  @IsInt() @Min(1) @Max(200)
  posTerminals: number;

  @IsInt() @Min(0) @Max(500)
  mobileTerminals: number;

  @IsNumberString()
  pricePerUser: string;

  @IsNumberString()
  pricePerPosTerminal: string;

  @IsNumberString()
  pricePerMobileTerminal: string;

  @IsOptional() @IsString() @MaxLength(8)
  currency?: string;

  @IsOptional() @IsString()
  notes?: string;
}

class SetStatusDto {
  @IsEnum(QuoteStatus)
  status: QuoteStatus;
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
}
