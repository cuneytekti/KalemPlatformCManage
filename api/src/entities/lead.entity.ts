import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  CONVERTED = 'CONVERTED',
  CLOSED = 'CLOSED',
}

/** Web sitesi demo formundan gelen başvurular. */
@Entity('leads')
export class Lead {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  company: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  /** Fiyat hesaplayıcı konfigürasyonu: "users=5, pos=2, mobile=0, monthly=173 AZN" */
  @Column({ nullable: true })
  config?: string;

  @Column({ default: 'website' })
  source: string;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.NEW })
  status: LeadStatus;

  /** Başvuru teklife dönüştürüldüyse dolu */
  @Column({ nullable: true })
  quoteId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
