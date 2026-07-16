import { MigrationInterface, QueryRunner } from 'typeorm';

export class CorporateQuotes1784300000000 implements MigrationInterface {
  name = 'CorporateQuotes1784300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."quotes_discount_type_enum" AS ENUM('NONE', 'FIXED', 'PERCENT')`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "quoteNumber" character varying`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "contactName" character varying`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "setupFee" numeric(12,2) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "discountType" "public"."quotes_discount_type_enum" NOT NULL DEFAULT 'NONE'`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "discountValue" numeric(12,2) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "setupNetTotal" numeric(12,2) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "firstYearTotal" numeric(12,2) NOT NULL DEFAULT '0'`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "projectDurationText" text NOT NULL DEFAULT 'Onay ve gerekli erişimlerin sağlanmasından sonra tahmini 45-65 iş günü.'`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "paymentTermsText" text NOT NULL DEFAULT 'Kurulum bedelinin %50''si siparişte, %50''si canlı geçiş tamamlandığında ödenir.'`);
    await queryRunner.query(`UPDATE "quotes" SET "quoteNumber" = 'KL-' || EXTRACT(YEAR FROM "createdAt")::text || '-' || UPPER(SUBSTRING(REPLACE("id"::text, '-', ''), 1, 8)), "firstYearTotal" = ROUND("monthlyTotal" * 12, 2)`);
    await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "quoteNumber" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD CONSTRAINT "UQ_quotes_quoteNumber" UNIQUE ("quoteNumber")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quotes" DROP CONSTRAINT "UQ_quotes_quoteNumber"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "paymentTermsText"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "projectDurationText"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "firstYearTotal"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "setupNetTotal"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "discountValue"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "discountType"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "setupFee"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "contactName"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "quoteNumber"`);
    await queryRunner.query(`DROP TYPE "public"."quotes_discount_type_enum"`);
  }
}
