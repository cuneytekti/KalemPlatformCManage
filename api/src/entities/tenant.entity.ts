import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum TenantStatus {
  PENDING = 'PENDING',
  PROVISIONING = 'PROVISIONING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  FAILED = 'FAILED',
  DELETED = 'DELETED',
}

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Subdomain: <slug>.kalemplatform.com */
  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  contactEmail?: string;

  @Column({ type: 'enum', enum: TenantStatus, default: TenantStatus.PENDING })
  status: TenantStatus;

  @Column({ nullable: true })
  dbName?: string;

  @Column({ nullable: true })
  dbUser?: string;

  @Column({ nullable: true })
  apiContainerId?: string;

  @Column({ nullable: true })
  webContainerId?: string;

  @Column({ nullable: true })
  mobileContainerId?: string;

  /** AES-GCM şifreli tenant DB şifresi (reconfigure için gerekli) */
  @Column({ nullable: true, select: false })
  dbPasswordEnc?: string;

  /** AES-GCM şifreli Kalem JWT secret'ı */
  @Column({ nullable: true, select: false })
  jwtSecretEnc?: string;

  /** Kullanım toplayıcının son okuduğu değerler */
  @Column({ type: 'jsonb', nullable: true })
  lastUsage?: {
    users?: number;
    posTerminals?: number;
    mobileTerminals?: number;
    fetchedAt?: string;
    alerts?: Array<{
      dimension: 'users' | 'posTerminals' | 'mobileTerminals';
      used: number;
      limit: number;
      level: 'NEAR' | 'OVER' | 'DRIFT';
    }>;
  };

  @Column({ default: 5 })
  licensedUsers: number;

  /** Lisanslı POS kasa sayısı */
  @Column({ default: 1 })
  licensedPosTerminals: number;

  /** Lisanslı mobil (el) terminali sayısı */
  @Column({ default: 0 })
  licensedMobileTerminals: number;

  @Column({ default: 'STANDALONE' })
  erpType: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
