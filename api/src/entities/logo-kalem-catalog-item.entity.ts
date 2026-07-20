import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('logo_kalem_catalog_items')
export class LogoKalemCatalogItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) code: string;
  @Column() category: string;
  @Column() nameTr: string;
  @Column({ nullable: true }) nameAz?: string;
  @Column({ nullable: true }) nameEn?: string;
  @Column({ type: 'text', nullable: true }) descriptionTr?: string;
  @Column({ default: 'Adet' }) unit: string;
  @Column({ default: 'ONE_TIME' }) billingPeriod: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) defaultPrice: string;
  @Column({ default: 'USD' }) currency: string;
  @Column({ default: true }) active: boolean;
  @Column({ default: 0 }) sortOrder: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
