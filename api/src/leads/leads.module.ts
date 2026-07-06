import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lead } from '../entities/lead.entity';
import { QuotesModule } from '../quotes/quotes.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lead]), QuotesModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
