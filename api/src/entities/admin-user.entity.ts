import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('admin_users')
export class AdminUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  /** Format: scrypt$<salt_hex>$<hash_hex> */
  @Column()
  passwordHash: string;

  @Column({ default: 'ADMIN' })
  role: string;

  /** TOTP sırrı (AES-256-GCM şifreli); null = 2FA kurulmamış */
  @Column({ nullable: true, select: false })
  totpSecretEnc?: string;

  @Column({ default: false })
  totpEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
