import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoicesService } from './invoices.service';

class SetStatusDto {
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;
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
}
