import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from '../common/crypto.service';
import { Tenant } from '../entities/tenant.entity';
import { MailModule } from '../mail/mail.module';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant]), MailModule],
  controllers: [UsageController],
  providers: [UsageService, CryptoService],
})
export class UsageModule {}
