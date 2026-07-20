import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('logo_kalem_quote_adjustments')
@Index(['revisionId', 'sortOrder'])
export class LogoKalemQuoteAdjustment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') revisionId: string;
  @Column() target: 'MAIN' | 'MAINTENANCE' | 'LEM';
  @Column({ default: 'TAX' }) type: 'TAX' | 'DISCOUNT' | 'OTHER';
  @Column() label: string;
  @Column({ default: 'PERCENT' }) method: 'PERCENT' | 'FIXED';
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) value: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) amount: string;
  @Column({ default: 0 }) sortOrder: number;
}
