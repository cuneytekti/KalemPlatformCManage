import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum OrderStatus {
  /** Ödeme bekleniyor (banka sayfasına yönlendirildi) */
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  /** Banka OK dedi; kurulum kuyruğa alındı */
  PAID = 'PAID',
  /** Banka reddetti / işlem başarısız */
  FAILED = 'FAILED',
  /** Ödeme sonrası tenant kurulumu tamamlandı */
  PROVISIONED = 'PROVISIONED',
}

/** Web sitesi satın alma siparişi (PashaBank ECOMM ödemesi). */
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  companyName: string;

  @Column()
  contactEmail: string;

  /** İstenen subdomain (tenant slug'ı) */
  @Column()
  slug: string;

  @Column({ default: 5 })
  seats: number;

  @Column({ default: 1 })
  posTerminals: number;

  @Column({ default: 0 })
  mobileTerminals: number;

  /** Sunucu tarafında hesaplanan aylık toplam (kuruş değil, ondalık) */
  @Column({ type: 'numeric', precision: 12, scale: 2 })
  monthlyTotal: string;

  @Column({ default: 'AZN' })
  currency: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  /** PashaBank ECOMM işlem kimliği (28 karakter, base64) */
  @Index({ unique: true })
  @Column({ nullable: true })
  pashaTransId?: string;

  /** Banka sonuç kodu (RESULT_CODE) — teşhis için saklanır */
  @Column({ nullable: true })
  resultCode?: string;

  /** Kurulan tenant */
  @Column({ nullable: true })
  tenantId?: string;

  @Column({ nullable: true })
  clientIp?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
