import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLogoKalemObjectCatalogName1784650600000 implements MigrationInterface {
  name = 'FixLogoKalemObjectCatalogName1784650600000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      UPDATE "logo_kalem_catalog_items"
      SET "nameTr" = 'Obje 2 Kullanıcı Artırımı',
          "descriptionTr" = NULL,
          "updatedAt" = now()
      WHERE "code" = 'LOGO-T3-OBJE2'
        AND "nameTr" = 'Logo Tiger 3 Object Ana Paket'
        AND BTRIM(COALESCE("descriptionTr", '')) = 'Obje 2kullanıcı arttırımı'
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      UPDATE "logo_kalem_catalog_items"
      SET "nameTr" = 'Logo Tiger 3 Object Ana Paket',
          "descriptionTr" = 'Obje 2kullanıcı arttırımı',
          "updatedAt" = now()
      WHERE "code" = 'LOGO-T3-OBJE2'
        AND "nameTr" = 'Obje 2 Kullanıcı Artırımı'
        AND "descriptionTr" IS NULL
    `);
  }
}
