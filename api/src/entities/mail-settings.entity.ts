import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export enum MailSecurityMode {
  AUTO = 'AUTO',
  TLS = 'TLS',
  STARTTLS = 'STARTTLS',
  NONE = 'NONE',
}

@Entity('mail_settings')
export class MailSettings {
  @PrimaryColumn({ default: 'default' })
  id: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ default: '' })
  host: string;

  @Column({ type: 'int', default: 587 })
  port: number;

  @Column({ default: MailSecurityMode.AUTO })
  security: MailSecurityMode;

  @Column({ default: true })
  authEnabled: boolean;

  @Column({ nullable: true })
  username?: string;

  @Column({ type: 'text', nullable: true, select: false })
  passwordEnc?: string;

  @Column({ default: 'Kalem Platform' })
  fromName: string;

  @Column({ default: 'info@kalemyazilim.az' })
  fromEmail: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
