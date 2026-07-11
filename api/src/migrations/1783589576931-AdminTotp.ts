import { MigrationInterface, QueryRunner } from "typeorm";

export class AdminTotp1783589576931 implements MigrationInterface {
    name = 'AdminTotp1783589576931'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_users" ADD "totpSecretEnc" character varying`);
        await queryRunner.query(`ALTER TABLE "admin_users" ADD "totpEnabled" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN "totpEnabled"`);
        await queryRunner.query(`ALTER TABLE "admin_users" DROP COLUMN "totpSecretEnc"`);
    }

}
