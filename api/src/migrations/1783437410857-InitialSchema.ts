import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1783437410857 implements MigrationInterface {
    name = 'InitialSchema1783437410857'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE TYPE "public"."tenants_status_enum" AS ENUM('PENDING', 'PROVISIONING', 'ACTIVE', 'SUSPENDED', 'FAILED', 'DELETED')`);
        await queryRunner.query(`CREATE TABLE "tenants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "slug" character varying NOT NULL, "name" character varying NOT NULL, "contactEmail" character varying, "status" "public"."tenants_status_enum" NOT NULL DEFAULT 'PENDING', "dbName" character varying, "dbUser" character varying, "apiContainerId" character varying, "webContainerId" character varying, "mobileContainerId" character varying, "dbPasswordEnc" character varying, "jwtSecretEnc" character varying, "lastUsage" jsonb, "licensedUsers" integer NOT NULL DEFAULT '5', "licensedPosTerminals" integer NOT NULL DEFAULT '1', "licensedMobileTerminals" integer NOT NULL DEFAULT '0', "erpType" character varying NOT NULL DEFAULT 'STANDALONE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_2310ecc5cb8be427097154b18fc" UNIQUE ("slug"), CONSTRAINT "PK_53be67a04681c66b87ee27c9321" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."quotes_status_enum" AS ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "quotes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerName" character varying NOT NULL, "contactEmail" character varying, "seats" integer NOT NULL DEFAULT '5', "posTerminals" integer NOT NULL DEFAULT '1', "mobileTerminals" integer NOT NULL DEFAULT '0', "pricePerUser" numeric(12,2) NOT NULL, "pricePerPosTerminal" numeric(12,2) NOT NULL, "pricePerMobileTerminal" numeric(12,2) NOT NULL DEFAULT '0', "monthlyTotal" numeric(12,2) NOT NULL, "currency" character varying NOT NULL DEFAULT 'AZN', "status" "public"."quotes_status_enum" NOT NULL DEFAULT 'DRAFT', "tenantId" character varying, "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_99a0e8bcbcd8719d3a41f23c263" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."provisioning_jobs_status_enum" AS ENUM('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "provisioning_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" character varying NOT NULL, "status" "public"."provisioning_jobs_status_enum" NOT NULL DEFAULT 'QUEUED', "currentStep" character varying, "logs" text NOT NULL DEFAULT '', "error" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e4d20ac3a2168bf791678a4665b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."licenses_status_enum" AS ENUM('ACTIVE', 'EXPIRED', 'CANCELLED')`);
        await queryRunner.query(`CREATE TABLE "licenses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" character varying NOT NULL, "seats" integer NOT NULL DEFAULT '5', "posTerminals" integer NOT NULL DEFAULT '1', "mobileTerminals" integer NOT NULL DEFAULT '0', "pricePerUser" numeric(12,2) NOT NULL DEFAULT '0', "pricePerPosTerminal" numeric(12,2) NOT NULL DEFAULT '0', "pricePerMobileTerminal" numeric(12,2) NOT NULL DEFAULT '0', "currency" character varying NOT NULL DEFAULT 'AZN', "validFrom" date NOT NULL, "validUntil" date, "status" "public"."licenses_status_enum" NOT NULL DEFAULT 'ACTIVE', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_da5021501ce80efa03de6f40086" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."leads_status_enum" AS ENUM('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED')`);
        await queryRunner.query(`CREATE TABLE "leads" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "company" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying, "message" text, "config" character varying, "source" character varying NOT NULL DEFAULT 'website', "status" "public"."leads_status_enum" NOT NULL DEFAULT 'NEW', "quoteId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_cd102ed7a9a4ca7d4d8bfeba406" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum" AS ENUM('DRAFT', 'SENT', 'PAID', 'OVERDUE')`);
        await queryRunner.query(`CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenantId" character varying NOT NULL, "period" character varying(7) NOT NULL, "lines" jsonb NOT NULL, "total" numeric(12,2) NOT NULL, "currency" character varying NOT NULL DEFAULT 'AZN', "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'DRAFT', "dueDate" date, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3f98d97b843bc08e0e230509a0" ON "invoices" ("tenantId", "period") `);
        await queryRunner.query(`CREATE TABLE "admin_users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "name" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'ADMIN', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_dcd0c8a4b10af9c986e510b9ecc" UNIQUE ("email"), CONSTRAINT "PK_06744d221bb6145dc61e5dc441d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userEmail" character varying, "method" character varying NOT NULL, "path" character varying NOT NULL, "success" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "admin_users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3f98d97b843bc08e0e230509a0"`);
        await queryRunner.query(`DROP TABLE "invoices"`);
        await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
        await queryRunner.query(`DROP TABLE "leads"`);
        await queryRunner.query(`DROP TYPE "public"."leads_status_enum"`);
        await queryRunner.query(`DROP TABLE "licenses"`);
        await queryRunner.query(`DROP TYPE "public"."licenses_status_enum"`);
        await queryRunner.query(`DROP TABLE "provisioning_jobs"`);
        await queryRunner.query(`DROP TYPE "public"."provisioning_jobs_status_enum"`);
        await queryRunner.query(`DROP TABLE "quotes"`);
        await queryRunner.query(`DROP TYPE "public"."quotes_status_enum"`);
        await queryRunner.query(`DROP TABLE "tenants"`);
        await queryRunner.query(`DROP TYPE "public"."tenants_status_enum"`);
    }

}
