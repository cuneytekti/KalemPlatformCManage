import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Quote, QuoteStatus } from './quote.entity';

export enum QuoteActivityType {
  EMAIL_SENT = 'EMAIL_SENT',
  PHONE_CALL = 'PHONE_CALL',
  VISIT = 'VISIT',
  MEETING = 'MEETING',
  NOTE = 'NOTE',
  STATUS_CHANGE = 'STATUS_CHANGE',
}

@Entity('quote_activities')
@Index(['quoteId', 'activityAt'])
export class QuoteActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  quoteId: string;

  @ManyToOne(() => Quote, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quoteId' })
  quote?: Quote;

  @Column({ type: 'enum', enum: QuoteActivityType })
  type: QuoteActivityType;

  @Column({ type: 'enum', enum: QuoteStatus, enumName: 'quotes_status_enum', nullable: true })
  status?: QuoteStatus;

  @Column({ type: 'text' })
  note: string;

  @Column({ type: 'timestamp' })
  activityAt: Date;

  @Column({ nullable: true })
  createdByEmail?: string;

  @CreateDateColumn()
  createdAt: Date;
}
