import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoService } from '../common/crypto.service';
import { MailSettings } from '../entities/mail-settings.entity';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([MailSettings])],
  controllers: [MailController],
  providers: [MailService, CryptoService],
  exports: [MailService],
})
export class MailModule {}
