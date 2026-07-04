import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../entities/tenant.entity';
import { UsageService } from './usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [UsageService],
})
export class UsageModule {}
