import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  FOLLOW_UP = 'FOLLOW_UP',
  MEETING = 'MEETING',
  NEGOTIATION = 'NEGOTIATION',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum QuoteDiscountType {
  NONE = 'NONE',
  FIXED = 'FIXED',
  PERCENT = 'PERCENT',
}

/**
 * Fiyat teklifi. Aylık toplam üç boyuttan hesaplanır:
 *   kullanıcı × birim + POS kasa × birim + mobil terminal × birim
 */
@Entity('quotes')
export class Quote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  quoteNumber: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  contactName?: string;

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

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  setupFee: string;

  @Column({ type: 'enum', enum: QuoteDiscountType, default: QuoteDiscountType.NONE })
  discountType: QuoteDiscountType;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  discountValue: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  setupNetTotal: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  firstYearTotal: string;

  @Column({ default: 'AZN' })
  currency: string;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  @Column({ nullable: true })
  sentLanguage?: 'az' | 'tr' | 'en';

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  /** Teklif tenant'a dönüştürüldüyse dolu (çifte dönüşüm koruması) */
  @Column({ nullable: true })
  tenantId?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', default: 'Onay ve gerekli erişimlerin sağlanmasından sonra tahmini 45-65 iş günü.' })
  projectDurationText: string;

  @Column({ type: 'text', default: 'Kurulum bedelinin %50\'si siparişte, %50\'si canlı geçiş tamamlandığında ödenir.' })
  paymentTermsText: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
