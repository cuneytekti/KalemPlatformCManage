import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLogoKalemObjectCatalogTranslations1784653000000 implements MigrationInterface {
  name = 'FixLogoKalemObjectCatalogTranslations1784653000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`
      UPDATE "logo_kalem_catalog_items"
      SET "nameTr" = CASE
            WHEN "nameTr" = 'Logo Tiger 3 Object Ana Paket' THEN 'Obje 2 Kullanıcı Artırımı'
            ELSE "nameTr"
          END,
          "nameAz" = CASE
            WHEN BTRIM(COALESCE("nameAz", '')) IN ('', 'Logo Tiger 3 Object Ana Paket') THEN 'Obyekt 2 İstifadəçi Artırımı'
            ELSE "nameAz"
          END,
          "nameEn" = CASE
            WHEN BTRIM(COALESCE("nameEn", '')) IN ('', 'Logo Tiger 3 Object Ana Paket') THEN 'Object 2 User Extension'
            ELSE "nameEn"
          END,
          "descriptionTr" = CASE
            WHEN BTRIM(COALESCE("descriptionTr", '')) = 'Obje 2kullanıcı arttırımı' THEN NULL
            ELSE "descriptionTr"
          END,
          "updatedAt" = now()
      WHERE "code" = 'LOGO-T3-OBJE2'
        AND (
          "nameTr" = 'Logo Tiger 3 Object Ana Paket'
          OR BTRIM(COALESCE("nameAz", '')) IN ('', 'Logo Tiger 3 Object Ana Paket')
          OR BTRIM(COALESCE("nameEn", '')) IN ('', 'Logo Tiger 3 Object Ana Paket')
          OR BTRIM(COALESCE("descriptionTr", '')) = 'Obje 2kullanıcı arttırımı'
        )
    `);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`
      UPDATE "logo_kalem_catalog_items"
      SET "nameAz" = CASE WHEN "nameAz" = 'Obyekt 2 İstifadəçi Artırımı' THEN 'Logo Tiger 3 Object Ana Paket' ELSE "nameAz" END,
          "nameEn" = CASE WHEN "nameEn" = 'Object 2 User Extension' THEN 'Logo Tiger 3 Object Ana Paket' ELSE "nameEn" END,
          "updatedAt" = now()
      WHERE "code" = 'LOGO-T3-OBJE2'
    `);
  }
}
