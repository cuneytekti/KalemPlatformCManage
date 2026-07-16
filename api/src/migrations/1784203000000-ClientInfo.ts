import { MigrationInterface, QueryRunner } from "typeorm";

export class ClientInfo1784203000000 implements MigrationInterface {
    name = 'ClientInfo1784203000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."client_info_status_enum" AS ENUM('NEW', 'CONTACTED', 'CONVERTED', 'CLOSED')`);
        await queryRunner.query(`CREATE TABLE "client_info" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "presentationDate" date, "fullName" character varying NOT NULL, "phone" character varying NOT NULL, "email" character varying NOT NULL, "position" character varying, "companyLegalName" character varying, "companyWebsite" character varying, "marketName" character varying, "headOfficeStreet" character varying, "headOfficeCity" character varying, "marketCity" character varying, "branchAddress" character varying, "mainActivity" character varying, "branchCount" integer, "cashRegisterCount" integer, "barcodeScannerCount" integer, "scaleCount" integer, "posTerminalCount" integer, "computerCount" integer, "hasServer" boolean, "branchesCentralSystem" boolean, "sendCommercialOffer" boolean, "offerSent" boolean NOT NULL DEFAULT false, "note" text, "status" "public"."client_info_status_enum" NOT NULL DEFAULT 'NEW', "quoteId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_client_info_id" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "client_info"`);
        await queryRunner.query(`DROP TYPE "public"."client_info_status_enum"`);
    }
}
