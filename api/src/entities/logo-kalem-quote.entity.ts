import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { QuoteStatus } from './quote.entity';

@Entity('logo_kalem_quotes')
export class LogoKalemQuote {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) baseNumber: string;
  @Column() customerName: string;
  @Column({ nullable: true }) contactName?: string;
  @Column({ nullable: true }) contactEmail?: string;
  @Column({ nullable: true }) contactPhone?: string;
  @Column({ type: 'enum', enum: QuoteStatus, enumName: 'quotes_status_enum', default: QuoteStatus.DRAFT }) status: QuoteStatus;
  @Column('uuid', { nullable: true }) activeRevisionId?: string;
  @Column({ type: 'timestamp', nullable: true }) sentAt?: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
