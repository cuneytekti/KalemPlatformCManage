import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum ClientInfoStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  CONVERTED = 'CONVERTED',
  CLOSED = 'CLOSED',
}

/**
 * Müşteri Bilgi Toplama kaydı.
 * Zoho "ClientDetails" (Müştəri Məlumatları / J-Retail Təqdimatı) formunun birebir karşılığı.
 */
@Entity('client_info')
export class ClientInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Təqdimat tarixi */
  @Column({ type: 'date', nullable: true })
  presentationDate?: string;

  /** Ad və soyad (zorunlu) */
  @Column()
  fullName: string;

  /** Əlaqə nömrəsi (zorunlu) */
  @Column()
  phone: string;

  /** E-mail (zorunlu) */
  @Column()
  email: string;

  /** Vəzifə */
  @Column({ nullable: true })
  position?: string;

  /** Şirkətin hüquqi adı */
  @Column({ nullable: true })
  companyLegalName?: string;

  /** Şirkət websaytı */
  @Column({ nullable: true })
  companyWebsite?: string;

  /** Marketin adı */
  @Column({ nullable: true })
  marketName?: string;

  /** Baş ofisin ünvanı — küçə */
  @Column({ nullable: true })
  headOfficeStreet?: string;

  /** Baş ofisin ünvanı — şəhər */
  @Column({ nullable: true })
  headOfficeCity?: string;

  /** Marketin yerləşdiyi şəhər */
  @Column({ nullable: true })
  marketCity?: string;

  /** Filialın ünvanı */
  @Column({ nullable: true })
  branchAddress?: string;

  /** Marketin əsas fəaliyyəti: Supermarket | Minimarket | Hipermarket | Topdan Satış */
  @Column({ nullable: true })
  mainActivity?: string;

  // ── Donanım / kapasite sayıları ──
  @Column({ type: 'int', nullable: true })
  branchCount?: number;

  @Column({ type: 'int', nullable: true })
  cashRegisterCount?: number;

  @Column({ type: 'int', nullable: true })
  barcodeScannerCount?: number;

  @Column({ type: 'int', nullable: true })
  scaleCount?: number;

  @Column({ type: 'int', nullable: true })
  posTerminalCount?: number;

  @Column({ type: 'int', nullable: true })
  computerCount?: number;

  // ── Bəli / Xeyr soruları ──
  /** Server mövcuddur? */
  @Column({ type: 'boolean', nullable: true })
  hasServer?: boolean;

  /** Filiallar mərkəzi sistemlə işləyir? */
  @Column({ type: 'boolean', nullable: true })
  branchesCentralSystem?: boolean;

  /** Kommersiya təklifi göndərilsin? */
  @Column({ type: 'boolean', nullable: true })
  sendCommercialOffer?: boolean;

  /** Teklif gönderildi mi? (iç takip alanı) */
  @Column({ default: false })
  offerSent: boolean;

  /** Qeyd */
  @Column({ type: 'text', nullable: true })
  note?: string;

  @Column({ type: 'enum', enum: ClientInfoStatus, default: ClientInfoStatus.NEW })
  status: ClientInfoStatus;

  /** Kayıt teklife dönüştürüldüyse dolu */
  @Column({ nullable: true })
  quoteId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
