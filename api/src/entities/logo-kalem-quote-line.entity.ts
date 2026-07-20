import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('logo_kalem_quote_lines')
@Index(['sectionId', 'sortOrder'])
export class LogoKalemQuoteLine {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') sectionId: string;
  @Column('uuid', { nullable: true }) catalogItemId?: string;
  @Column() name: string;
  @Column({ type: 'text', nullable: true }) description?: string;
  @Column({ nullable: true }) location?: string;
  @Column({ default: 'Adet' }) unit: string;
  @Column({ default: 'USD' }) currency: string;
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true }) userCount?: string;
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 1 }) quantity: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) unitPrice: string;
  @Column({ default: 'NONE' }) discountType: 'NONE' | 'FIXED' | 'PERCENT';
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) discountValue: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) grossTotal: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) discountTotal: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) netTotal: string;
  @Column({ default: 0 }) sortOrder: number;
}
