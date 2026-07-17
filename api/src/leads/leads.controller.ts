import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { Public } from '../auth/public.decorator';
import { Lead, LeadStatus } from '../entities/lead.entity';
import { Quote } from '../entities/quote.entity';
import { CreateQuoteDto } from '../quotes/quote-input.dto';
import { LeadsService } from './leads.service';

class CreateLeadDto {
  @IsString() @MaxLength(120)
  name: string;

  @IsString() @MaxLength(120)
  company: string;

  @IsEmail()
  email: string;

  @IsOptional() @IsString() @MaxLength(32)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  message?: string;

  @IsOptional() @IsString() @MaxLength(200)
  config?: string;

  /** Honeypot: gerçek kullanıcılar bu alanı görmez; dolu gelirse bot'tur. */
  @IsOptional() @IsString() @MaxLength(200)
  website?: string;
}

class SetStatusDto {
  @IsEnum(LeadStatus)
  status: LeadStatus;
}

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /** Web sitesi demo formu — auth'suz ama sıkı oran sınırlı. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateLeadDto): Promise<{ ok: true }> {
    // Honeypot doluysa sessizce kabul et (bot'a sinyal verme), kaydetme
    if (!dto.website) {
      const { website, ...data } = dto;
      void website;
      await this.leadsService.create(data);
    }
    return { ok: true };
  }

  @Get()
  findAll(): Promise<Lead[]> {
    return this.leadsService.findAll();
  }

  /** Teklif formundaki değerlerle başvuruya bağlı DRAFT teklif oluşturur. */
  @Post(':id/convert-to-quote')
  convertToQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuoteDto,
  ): Promise<Quote> {
    return this.leadsService.convertToQuote(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStatusDto): Promise<Lead> {
    return this.leadsService.setStatus(id, dto.status);
  }
}
