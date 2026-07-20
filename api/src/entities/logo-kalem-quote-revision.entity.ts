import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('logo_kalem_quote_revisions')
@Index(['quoteId', 'revisionNumber'], { unique: true })
export class LogoKalemQuoteRevision {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('uuid') quoteId: string;
  @Column({ default: 0 }) revisionNumber: number;
  @Column({ default: 'tr' }) language: 'tr' | 'az' | 'en';
  @Column() projectTitle: string;
  @Column({ nullable: true }) subject?: string;
  @Column({ type: 'date', nullable: true }) meetingDate?: string;
  @Column({ type: 'date' }) quoteDate: string;
  @Column({ default: 'Cüneyt Ekti' }) senderName: string;
  @Column({ nullable: true }) senderPhone?: string;
  @Column({ nullable: true }) senderEmail?: string;
  @Column({ type: 'text', nullable: true }) introduction?: string;
  @Column({ type: 'text', nullable: true }) projectScope?: string;
  @Column({ type: 'text', nullable: true }) projectTeam?: string;
  @Column({ type: 'text', nullable: true }) projectDuration?: string;
  @Column({ type: 'text', nullable: true }) paymentTerms?: string;
  @Column({ type: 'text', nullable: true }) validityTerms?: string;
  @Column({ type: 'text', nullable: true }) deliveryTerms?: string;
  @Column({ type: 'text', nullable: true }) travelTerms?: string;
  @Column({ type: 'text', nullable: true }) notes?: string;
  @Column({ default: true }) includeReferences: boolean;
  @Column({ default: true }) includeCertificates: boolean;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) mainTotal: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) maintenanceTotal: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) lemTotal: string;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) taxTotal: string;
  @Column({ type: 'timestamp', nullable: true }) lockedAt?: Date;
  @Column({ type: 'bytea', nullable: true, select: false }) pdfSnapshot?: Buffer;
  @Column({ nullable: true, select: false }) pdfSha256?: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
