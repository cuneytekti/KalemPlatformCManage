import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { DockerService } from '../provisioning/docker.service';

const DB_CONTAINER = 'cmanage-db';
const BACKUP_DIR = '/backups';

/**
 * Gece yedeği: cmanage + tüm tenant veritabanları pg_dumpall ile
 * db container'ındaki /backups volume'üne alınır (her gece 02:30 Bakü).
 * Saklama: BACKUP_RETENTION_DAYS günden eski yedekler silinir.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    private readonly docker: DockerService,
    private readonly config: ConfigService,
  ) {}

  get enabled(): boolean {
    return this.config.get<boolean>('backup.enabled') !== false;
  }

  @Cron('30 2 * * *', { timeZone: 'Asia/Baku' })
  async nightly(): Promise<void> {
    if (!this.enabled) return;
    try {
      const file = await this.run();
      await this.cleanup();
      this.logger.log(`Yedek alındı: ${file}`);
    } catch (err) {
      this.logger.error(`Yedekleme başarısız: ${err instanceof Error ? err.message : err}`);
    }
  }

  /** Yedeği hemen alır; dosya adını döner. */
  async run(): Promise<string> {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const file = `${BACKUP_DIR}/cmanage-all-${stamp}.sql.gz`;
    await this.docker.execInContainer(DB_CONTAINER, [
      'sh', '-c',
      `mkdir -p ${BACKUP_DIR} && pg_dumpall -U cmanage | gzip > ${file} && ls -la ${file}`,
    ]);
    return file.split('/').pop()!;
  }

  /** Saklama politikası: N günden eski yedekleri siler. */
  async cleanup(): Promise<void> {
    const days = this.config.get<number>('backup.retentionDays') ?? 14;
    await this.docker.execInContainer(DB_CONTAINER, [
      'sh', '-c',
      `find ${BACKUP_DIR} -name '*.sql.gz' -mtime +${days} -delete 2>/dev/null || true`,
    ]);
  }

  /** Mevcut yedekler (ad + bayt) — panel için. */
  async list(): Promise<Array<{ file: string; sizeBytes: number }>> {
    try {
      const out = await this.docker.execInContainer(DB_CONTAINER, [
        'sh', '-c', `ls -l ${BACKUP_DIR}/*.sql.gz 2>/dev/null || true`,
      ]);
      return out
        .split('\n')
        .map((l) => l.trim().split(/\s+/))
        .filter((p) => p.length >= 9 && p[p.length - 1].endsWith('.sql.gz'))
        .map((p) => ({ file: p[p.length - 1].split('/').pop()!, sizeBytes: parseInt(p[4], 10) || 0 }));
    } catch {
      return [];
    }
  }
}
