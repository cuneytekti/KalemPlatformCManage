import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { IsEnum, IsIn, IsOptional } from 'class-validator';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoicesService } from './invoices.service';

class SetStatusDto {
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;
}

class SendDto {
  @IsOptional() @IsIn(['az', 'tr', 'en'])
  lang?: 'az' | 'tr' | 'en';
}

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll(): Promise<Invoice[]> {
    return this.invoicesService.findAll();
  }

  /** Manuel dönem üretimi; period verilmezse içinde bulunulan ay. */
  @Post('generate')
  generate(@Query('period') period?: string): Promise<Invoice[]> {
    return this.invoicesService.generateForPeriod(period ?? new Date().toISOString().slice(0, 7));
  }

  @Patch(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStatusDto): Promise<Invoice> {
    return this.invoicesService.setStatus(id, dto.status);
  }

  @Get(':id/pdf')
  async pdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('lang') lang: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const language = lang === 'tr' || lang === 'en' ? lang : 'az';
    const { pdf, invoice, tenant } = await this.invoicesService.renderPdf(id, language);
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="fatura-${invoice.period}-${tenant.slug}.pdf"`,
      })
      .send(pdf);
  }

  /** Fatura PDF'ini müşteriye e-postayla gönderir (SENT işaretler). */
  @Post(':id/send')
  send(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SendDto): Promise<Invoice> {
    return this.invoicesService.sendByEmail(id, dto.lang ?? 'az');
  }
}
