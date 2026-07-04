import {
  Body, Controller, Delete, Get, MessageEvent, Param, ParseUUIDPipe, Post, Patch, Query, Sse,
} from '@nestjs/common';
import { IsInt, Max, Min } from 'class-validator';
import { Observable } from 'rxjs';
import { Tenant } from '../entities/tenant.entity';
import { ProvisioningService } from '../provisioning/provisioning.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantsService } from './tenants.service';

class UpdateLicenseDto {
  @IsInt() @Min(1) @Max(1000)
  licensedUsers: number;

  @IsInt() @Min(1) @Max(200)
  licensedPosTerminals: number;

  @IsInt() @Min(0) @Max(500)
  licensedMobileTerminals: number;
}

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly provisioning: ProvisioningService,
  ) {}

  @Get()
  findAll(): Promise<Tenant[]> {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Tenant> {
    return this.tenantsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTenantDto): Promise<Tenant> {
    return this.tenantsService.createAndProvision(dto);
  }

  @Post(':id/retry')
  retry(@Param('id', ParseUUIDPipe) id: string): Promise<Tenant> {
    return this.tenantsService.retry(id);
  }

  @Post(':id/suspend')
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<Tenant> {
    return this.tenantsService.suspend(id);
  }

  @Post(':id/resume')
  resume(@Param('id', ParseUUIDPipe) id: string): Promise<Tenant> {
    return this.tenantsService.resume(id);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('dropDatabase') dropDatabase?: string,
  ): Promise<Tenant> {
    return this.tenantsService.remove(id, dropDatabase === 'true');
  }

  @Patch(':id/license')
  updateLicense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLicenseDto,
  ): Promise<Tenant> {
    return this.tenantsService.updateLicense(id, dto);
  }

  /** Canlı kurulum logu (Server-Sent Events) */
  @Sse(':id/logs')
  logs(@Param('id', ParseUUIDPipe) id: string): Observable<MessageEvent> {
    return this.provisioning.stream(id);
  }
}
