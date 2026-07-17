import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { IsDateString, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import type { JwtPayload } from '../auth/jwt-auth.guard';
import { QuoteActivity, QuoteActivityType } from '../entities/quote-activity.entity';
import { Tenant } from '../entities/tenant.entity';
import { Quote, QuoteStatus } from '../entities/quote.entity';
import { CreateQuoteDto } from './quote-input.dto';
import { QuotePdfService, QuoteLang } from './quote-pdf.service';
import { QuotesService } from './quotes.service';

export { CreateQuoteDto } from './quote-input.dto';

class SetStatusDto {
  @IsEnum(QuoteStatus)
  status: QuoteStatus;

  @IsString() @MinLength(2) @MaxLength(2000)
  note: string;
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

export class CreateQuoteActivityDto {
  @IsEnum(QuoteActivityType)
  type: QuoteActivityType;

  @IsOptional() @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @IsString() @MinLength(2) @MaxLength(2000)
  note: string;

  @IsOptional() @IsDateString()
  activityAt?: string;
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
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetStatusDto,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<Quote> {
    return this.quotesService.setStatus(id, dto.status, req.user?.email, dto.note);
  }

  @Get(':id/activities')
  activities(@Param('id', ParseUUIDPipe) id: string): Promise<QuoteActivity[]> {
    return this.quotesService.getActivities(id);
  }

  @Post(':id/activities')
  addActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuoteActivityDto,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<QuoteActivity> {
    return this.quotesService.addActivity(id, dto, req.user?.email);
  }

  /** Teklif PDF'ini müşteriye e-postayla gönderir (SENT işaretler). */
  @Post(':id/send')
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendDto,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<Quote> {
    return this.quotesService.sendByEmail(id, dto.lang ?? 'az', req.user?.email);
  }

  /** Teklifi tek tıkla tenant'a dönüştürür: kurulum + lisans + ACCEPTED. */
  @Post(':id/convert-to-tenant')
  convert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertDto,
    @Req() req: Request & { user?: JwtPayload },
  ): Promise<Tenant> {
    return this.quotesService.convertToTenant(id, dto.slug, req.user?.email);
  }
}
