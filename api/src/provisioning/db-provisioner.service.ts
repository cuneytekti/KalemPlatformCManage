import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Client } from 'pg';

export interface TenantDbCredentials {
  dbName: string;
  dbUser: string;
  dbPassword: string;
}

/** Paylaşılan PostgreSQL sunucusunda tenant'a özel DB + kullanıcı açar. */
@Injectable()
export class DbProvisionerService {
  constructor(private readonly config: ConfigService) {}

  private adminClient(): Client {
    return new Client({
      host: this.config.get<string>('tenant.dbHost'),
      port: 5432,
      user: this.config.get<string>('tenant.dbAdminUser'),
      password: this.config.get<string>('tenant.dbAdminPassword'),
      database: 'postgres',
    });
  }

  /** slug DTO'da ^[a-z][a-z0-9-]+$ ile doğrulanır; identifier yine de sıkılaştırılır. */
  private toIdentifier(slug: string, prefix: string): string {
    const safe = slug.replace(/[^a-z0-9]/g, '_');
    return `${prefix}_${safe}`;
  }

  async createTenantDatabase(slug: string): Promise<TenantDbCredentials> {
    const dbName = this.toIdentifier(slug, 'kalem');
    const dbUser = this.toIdentifier(slug, 't');
    const dbPassword = randomBytes(24).toString('base64url');

    const client = this.adminClient();
    await client.connect();
    try {
      const userExists = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [dbUser]);
      if (userExists.rowCount === 0) {
        await client.query(`CREATE ROLE "${dbUser}" LOGIN PASSWORD '${dbPassword}'`);
      } else {
        await client.query(`ALTER ROLE "${dbUser}" LOGIN PASSWORD '${dbPassword}'`);
      }
      const dbExists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      if (dbExists.rowCount === 0) {
        await client.query(`CREATE DATABASE "${dbName}" OWNER "${dbUser}"`);
      }
      return { dbName, dbUser, dbPassword };
    } finally {
      await client.end();
    }
  }

  async dropTenantDatabase(slug: string): Promise<void> {
    const dbName = this.toIdentifier(slug, 'kalem');
    const dbUser = this.toIdentifier(slug, 't');
    const client = this.adminClient();
    await client.connect();
    try {
      await client.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
      await client.query(`DROP ROLE IF EXISTS "${dbUser}"`);
    } finally {
      await client.end();
    }
  }
}
