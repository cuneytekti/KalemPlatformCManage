import { MigrationInterface, QueryRunner } from "typeorm";

export class Orders1783514103652 implements MigrationInterface {
    name = 'Orders1783514103652'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING_PAYMENT', 'PAID', 'FAILED', 'PROVISIONED')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "companyName" character varying NOT NULL, "contactEmail" character varying NOT NULL, "slug" character varying NOT NULL, "seats" integer NOT NULL DEFAULT '5', "posTerminals" integer NOT NULL DEFAULT '1', "mobileTerminals" integer NOT NULL DEFAULT '0', "monthlyTotal" numeric(12,2) NOT NULL, "currency" character varying NOT NULL DEFAULT 'AZN', "status" "public"."orders_status_enum" NOT NULL DEFAULT 'PENDING_PAYMENT', "pashaTransId" character varying, "resultCode" character varying, "tenantId" character varying, "clientIp" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fcab9c8ff28d766f1017f2157c" ON "orders" ("pashaTransId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_fcab9c8ff28d766f1017f2157c"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
    }

}
