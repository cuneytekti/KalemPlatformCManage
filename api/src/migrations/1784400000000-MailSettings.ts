import { MigrationInterface, QueryRunner } from 'typeorm';

export class MailSettings1784400000000 implements MigrationInterface {
  name = 'MailSettings1784400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "mail_settings" (
      "id" character varying NOT NULL DEFAULT 'default',
      "enabled" boolean NOT NULL DEFAULT false,
      "host" character varying NOT NULL DEFAULT '',
      "port" integer NOT NULL DEFAULT 587,
      "security" character varying NOT NULL DEFAULT 'AUTO',
      "authEnabled" boolean NOT NULL DEFAULT true,
      "username" character varying,
      "passwordEnc" text,
      "fromName" character varying NOT NULL DEFAULT 'Kalem Platform',
      "fromEmail" character varying NOT NULL DEFAULT 'info@kalemyazilim.az',
      "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_mail_settings" PRIMARY KEY ("id")
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "mail_settings"`);
  }
}
