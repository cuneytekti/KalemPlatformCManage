import { MigrationInterface, QueryRunner } from 'typeorm';

export class QuoteSalesTracking1784500000000 implements MigrationInterface {
  name = 'QuoteSalesTracking1784500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."quotes_status_enum" ADD VALUE IF NOT EXISTS 'FOLLOW_UP'`);
    await queryRunner.query(`ALTER TYPE "public"."quotes_status_enum" ADD VALUE IF NOT EXISTS 'MEETING'`);
    await queryRunner.query(`ALTER TYPE "public"."quotes_status_enum" ADD VALUE IF NOT EXISTS 'NEGOTIATION'`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "sentLanguage" character varying`);
    await queryRunner.query(`ALTER TABLE "quotes" ADD "sentAt" TIMESTAMP`);
    await queryRunner.query(`CREATE TYPE "public"."quote_activities_type_enum" AS ENUM('EMAIL_SENT', 'PHONE_CALL', 'VISIT', 'MEETING', 'NOTE', 'STATUS_CHANGE')`);
    await queryRunner.query(`CREATE TABLE "quote_activities" (
      "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
      "quoteId" uuid NOT NULL,
      "type" "public"."quote_activities_type_enum" NOT NULL,
      "status" "public"."quotes_status_enum",
      "note" text NOT NULL,
      "activityAt" TIMESTAMP NOT NULL,
      "createdByEmail" character varying,
      "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
      CONSTRAINT "PK_quote_activities" PRIMARY KEY ("id"),
      CONSTRAINT "FK_quote_activities_quote" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_quote_activities_quote_activity" ON "quote_activities" ("quoteId", "activityAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_quote_activities_quote_activity"`);
    await queryRunner.query(`DROP TABLE "quote_activities"`);
    await queryRunner.query(`DROP TYPE "public"."quote_activities_type_enum"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "sentAt"`);
    await queryRunner.query(`ALTER TABLE "quotes" DROP COLUMN "sentLanguage"`);
    await queryRunner.query(`UPDATE "quotes" SET "status" = 'SENT' WHERE "status" IN ('FOLLOW_UP', 'MEETING', 'NEGOTIATION')`);
    await queryRunner.query(`ALTER TYPE "public"."quotes_status_enum" RENAME TO "quotes_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."quotes_status_enum" AS ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED')`);
    await queryRunner.query(`ALTER TABLE "quotes" ALTER COLUMN "status" TYPE "public"."quotes_status_enum" USING "status"::text::"public"."quotes_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."quotes_status_enum_old"`);
  }
}
