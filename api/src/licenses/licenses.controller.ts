import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { IsDateString, IsInt, IsNumberString, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { License } from '../entities/license.entity';
import { LicensesService } from './licenses.service';

class CreateLicenseDto {
  @IsUUID()
  tenantId: string;

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

  @IsDateString()
  validFrom: string;

  @IsOptional() @IsDateString()
  validUntil?: string;
}

class UpdateSeatsDto {
  @IsInt() @Min(1) @Max(1000)
  seats: number;
}

@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  @Get()
  findAll(@Query('tenantId') tenantId?: string): Promise<License[]> {
    return tenantId
      ? this.licensesService.findForTenant(tenantId)
      : this.licensesService.findAll();
  }

  @Post()
  create(@Body() dto: CreateLicenseDto): Promise<License> {
    return this.licensesService.create(dto);
  }

  @Patch(':id/seats')
  updateSeats(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSeatsDto): Promise<License> {
    return this.licensesService.updateSeats(id, dto.seats);
  }

  @Patch(':id/cancel')
  cancel(@Param('id', ParseUUIDPipe) id: string): Promise<License> {
    return this.licensesService.cancel(id);
  }
}
