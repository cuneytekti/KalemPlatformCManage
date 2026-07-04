import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('licenses')
export class License {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /** Kullanıcı (koltuk) sayısı */
  @Column({ default: 5 })
  seats: number;

  /** POS kasa sayısı */
  @Column({ default: 1 })
  posTerminals: number;

  /** Mobil terminal sayısı */
  @Column({ default: 0 })
  mobileTerminals: number;

  // ── Birim fiyatlar (aylık faturalama için) ──
  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  pricePerUser: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  pricePerPosTerminal: string;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  pricePerMobileTerminal: string;

  @Column({ default: 'AZN' })
  currency: string;

  @Column({ type: 'date' })
  validFrom: string;

  @Column({ type: 'date', nullable: true })
  validUntil?: string;

  @Column({ type: 'enum', enum: LicenseStatus, default: LicenseStatus.ACTIVE })
  status: LicenseStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
