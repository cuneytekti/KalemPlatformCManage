import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsBoolean, IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';
import { ClientInfo, ClientInfoStatus } from '../entities/client-info.entity';
import { Quote } from '../entities/quote.entity';
import { ClientInfoService } from './client-info.service';

class CreateClientInfoDto {
  @IsOptional() @IsDateString()
  presentationDate?: string;

  @IsString() @MaxLength(120)
  fullName: string;

  @IsString() @MaxLength(32)
  phone: string;

  @IsEmail()
  email: string;

  @IsOptional() @IsString() @MaxLength(120)
  position?: string;

  @IsOptional() @IsString() @MaxLength(200)
  companyLegalName?: string;

  @IsOptional() @IsString() @MaxLength(200)
  companyWebsite?: string;

  @IsOptional() @IsString() @MaxLength(200)
  marketName?: string;

  @IsOptional() @IsString() @MaxLength(200)
  headOfficeStreet?: string;

  @IsOptional() @IsString() @MaxLength(120)
  headOfficeCity?: string;

  @IsOptional() @IsString() @MaxLength(120)
  marketCity?: string;

  @IsOptional() @IsString() @MaxLength(300)
  branchAddress?: string;

  @IsOptional() @IsString() @MaxLength(60)
  mainActivity?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  branchCount?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  cashRegisterCount?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  barcodeScannerCount?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  scaleCount?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  posTerminalCount?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  computerCount?: number;

  @IsOptional() @IsBoolean()
  hasServer?: boolean;

  @IsOptional() @IsBoolean()
  branchesCentralSystem?: boolean;

  @IsOptional() @IsBoolean()
  sendCommercialOffer?: boolean;

  @IsOptional() @IsBoolean()
  offerSent?: boolean;

  @IsOptional() @IsString() @MaxLength(4000)
  note?: string;
}

/** Tüm alanları isteğe bağlı güncelleme DTO'su (fullName/phone/email dahil). */
class UpdateClientInfoDto extends CreateClientInfoDto {
  @IsOptional() @IsString() @MaxLength(120)
  declare fullName: string;

  @IsOptional() @IsString() @MaxLength(32)
  declare phone: string;

  @IsOptional() @IsEmail()
  declare email: string;
}

class SetStatusDto {
  @IsEnum(ClientInfoStatus)
  status: ClientInfoStatus;
}

@Controller('client-info')
export class ClientInfoController {
  constructor(private readonly service: ClientInfoService) {}

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateClientInfoDto): Promise<ClientInfo> {
    return this.service.create(dto);
  }

  @Get()
  findAll(): Promise<ClientInfo[]> {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ClientInfo> {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientInfoDto,
  ): Promise<ClientInfo> {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetStatusDto): Promise<ClientInfo> {
    return this.service.setStatus(id, dto.status);
  }

  /** Kaydı tek tıkla DRAFT teklife dönüştürür. */
  @Post(':id/convert-to-quote')
  convertToQuote(@Param('id', ParseUUIDPipe) id: string): Promise<Quote> {
    return this.service.convertToQuote(id);
  }
}
