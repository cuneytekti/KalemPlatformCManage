import { Controller, Get, Post } from '@nestjs/common';
import { DockerService } from '../provisioning/docker.service';
import { BackupService } from './backup.service';
import { HealthMonitorService } from './health-monitor.service';

@Controller('system')
export class SystemController {
  constructor(
    private readonly docker: DockerService,
    private readonly backup: BackupService,
    private readonly healthMonitor: HealthMonitorService,
  ) {}

  @Get('stats')
  stats() {
    return this.docker.systemStats();
  }

  /** Mevcut yedek dosyaları. */
  @Get('backups')
  backups() {
    return this.backup.list();
  }

  /** Yedeği hemen al (normalde gece 02:30 cron). */
  @Post('backups/run')
  async runBackup() {
    const file = await this.backup.run();
    await this.backup.cleanup();
    return { file };
  }

  /** Aktif container arızaları (5 dk'lık denetimden). */
  @Get('health-alerts')
  healthAlerts() {
    return this.healthMonitor.alerts();
  }
}
