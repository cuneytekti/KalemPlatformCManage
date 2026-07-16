import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientInfo } from '../entities/client-info.entity';
import { QuotesModule } from '../quotes/quotes.module';
import { ClientInfoController } from './client-info.controller';
import { ClientInfoService } from './client-info.service';

@Module({
  imports: [TypeOrmModule.forFeature([ClientInfo]), QuotesModule],
  controllers: [ClientInfoController],
  providers: [ClientInfoService],
})
export class ClientInfoModule {}
