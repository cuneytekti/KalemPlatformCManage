import { Controller, Get, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Controller('audit')
export class AuditController {
  constructor(@InjectRepository(AuditLog) private readonly logs: Repository<AuditLog>) {}

  @Get()
  findRecent(@Query('limit') limit?: string): Promise<AuditLog[]> {
    return this.logs.find({
      order: { createdAt: 'DESC' },
      take: Math.min(parseInt(limit ?? '100', 10) || 100, 500),
    });
  }
}
