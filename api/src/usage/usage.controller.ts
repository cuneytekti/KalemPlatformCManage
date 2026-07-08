import { Controller, Get, Post } from '@nestjs/common';
import { UsageService } from './usage.service';

@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  /** Uyarısı olan ACTIVE tenant'lar (dashboard). */
  @Get('alerts')
  alerts() {
    return this.usageService.alerts();
  }

  /** Kullanım toplamayı elle tetikler (normalde saatlik cron). */
  @Post('collect')
  collect() {
    return this.usageService.collect();
  }
}
