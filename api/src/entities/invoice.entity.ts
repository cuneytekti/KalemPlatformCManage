import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface InvoiceLine {
  label: string;
  qty: number;
  unitPrice: string;
  total: string;
}

/** Aylık fatura: tenant + dönem (YYYY-MM) başına tek kayıt. */
@Entity('invoices')
@Index(['tenantId', 'period'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  /** Fatura dönemi: YYYY-MM */
  @Column({ length: 7 })
  period: string;

  @Column({ type: 'jsonb' })
  lines: InvoiceLine[];

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  total: string;

  @Column({ default: 'AZN' })
  currency: string;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ type: 'date', nullable: true })
  dueDate?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
