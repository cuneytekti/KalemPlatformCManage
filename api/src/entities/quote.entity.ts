import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

/**
 * Fiyat teklifi. Aylık toplam üç boyuttan hesaplanır:
 *   kullanıcı × birim + POS kasa × birim + mobil terminal × birim
 */
@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  contactEmail?: string;

  // ── Miktarlar ──
  @Column({ default: 5 })
  seats: number;

  @Column({ default: 1 })
  posTerminals: number;

  @Column({ default: 0 })
  mobileTerminals: number;

  // ── Birim fiyatlar (aylık) ──
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  pricePerUser: string;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  pricePerPosTerminal: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  pricePerMobileTerminal: string;

  /** Hesaplanan aylık toplam (kaydederken servis hesaplar) */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  monthlyTotal: string;

  @Column({ default: 'AZN' })
  currency: string;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  /** Teklif tenant'a dönüştürüldüyse dolu (çifte dönüşüm koruması) */
  @Column({ nullable: true })
  tenantId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
