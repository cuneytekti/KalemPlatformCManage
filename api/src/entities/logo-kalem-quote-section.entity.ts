import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('logo_kalem_quote_sections')
@Index(['revisionId', 'sortOrder'])
export class LogoKalemQuoteSection {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') revisionId: string;
  @Column() type: 'MAIN' | 'SERVICE' | 'MAINTENANCE' | 'LEM';
  @Column() title: string;
  @Column({ default: 'USD' }) currency: string;
  @Column({ default: 'ONE_TIME' }) billingPeriod: string;
  @Column({ default: 0 }) sortOrder: number;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) subtotal: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) discountTotal: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) netTotal: string;
}
