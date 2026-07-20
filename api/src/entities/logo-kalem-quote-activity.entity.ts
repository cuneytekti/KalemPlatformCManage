import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { QuoteActivityType } from './quote-activity.entity';
import { QuoteStatus } from './quote.entity';

@Entity('logo_kalem_quote_activities')
@Index(['quoteId', 'activityAt'])
export class LogoKalemQuoteActivity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') quoteId: string;
  @Column({ type: 'enum', enum: QuoteActivityType, enumName: 'quote_activities_type_enum' }) type: QuoteActivityType;
  @Column({ type: 'enum', enum: QuoteStatus, enumName: 'quotes_status_enum', nullable: true }) status?: QuoteStatus;
  @Column({ type: 'text' }) note: string;
  @Column({ type: 'timestamp' }) activityAt: Date;
  @Column({ nullable: true }) createdByEmail?: string;
  @CreateDateColumn() createdAt: Date;
}
