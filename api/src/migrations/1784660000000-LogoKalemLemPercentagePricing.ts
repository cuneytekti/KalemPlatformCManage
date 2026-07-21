import { MigrationInterface, QueryRunner } from 'typeorm';

export class LogoKalemLemPercentagePricing1784660000000 implements MigrationInterface {
  name = 'LogoKalemLemPercentagePricing1784660000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "logo_kalem_quote_lines" ADD "pricingMode" varchar NOT NULL DEFAULT 'STANDARD'`);
    await q.query(`ALTER TABLE "logo_kalem_quote_lines" ADD "ratePercent" numeric(5,2)`);
    await q.query(`ALTER TABLE "logo_kalem_quote_lines" ADD "calculationBase" numeric(14,2) NOT NULL DEFAULT 0`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE "logo_kalem_quote_lines" DROP COLUMN "calculationBase"`);
    await q.query(`ALTER TABLE "logo_kalem_quote_lines" DROP COLUMN "ratePercent"`);
    await q.query(`ALTER TABLE "logo_kalem_quote_lines" DROP COLUMN "pricingMode"`);
  }
}
