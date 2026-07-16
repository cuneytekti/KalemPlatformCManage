import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ClientInfoModule } from './client-info/client-info.module';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { InvoicesModule } from './invoices/invoices.module';
import { LeadsModule } from './leads/leads.module';
import { MailModule } from './mail/mail.module';
import { LicensesModule } from './licenses/licenses.module';
import { PaymentsModule } from './payments/payments.module';
import { ProvisioningModule } from './provisioning/provisioning.module';
import { QuotesModule } from './quotes/quotes.module';
import { SystemModule } from './system/system.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsageModule } from './usage/usage.module';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        pinoHttp: {
          level: cfg.get<string>('logLevel'),
          redact: ['req.headers.authorization', 'req.headers.cookie'],
          autoLogging: { ignore: (req) => req.url === '/api/health' },
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get<string>('databaseUrl'),
        autoLoadEntities: true,
        // Geliştirmede true; üretimde DB_SYNCHRONIZE=false + migration'lar
        synchronize: cfg.get<boolean>('dbSynchronize'),
        migrations: [__dirname + '/migrations/*.js'],
        migrationsRun: !cfg.get<boolean>('dbSynchronize'),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get<string>('redis.host'),
          port: cfg.get<number>('redis.port'),
        },
      }),
    }),
    // Genel oran sınırı: dakikada 120 istek (login için AuthController'da daha sıkı)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    ScheduleModule.forRoot(),
    HealthModule,
    MailModule,
    AuthModule,
    AuditModule,
    SystemModule,
    UsageModule,
    InvoicesModule,
    LeadsModule,
    ClientInfoModule,
    TenantsModule,
    PaymentsModule,
    ProvisioningModule,
    LicensesModule,
    QuotesModule,
    WebhooksModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
