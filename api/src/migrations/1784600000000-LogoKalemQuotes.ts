import { MigrationInterface, QueryRunner } from 'typeorm';

export class LogoKalemQuotes1784600000000 implements MigrationInterface {
  name = 'LogoKalemQuotes1784600000000';

  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "logo_kalem_catalog_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "code" varchar NOT NULL, "category" varchar NOT NULL, "nameTr" varchar NOT NULL, "nameAz" varchar, "nameEn" varchar, "descriptionTr" text, "unit" varchar NOT NULL DEFAULT 'Adet', "billingPeriod" varchar NOT NULL DEFAULT 'ONE_TIME', "defaultPrice" numeric(14,2) NOT NULL DEFAULT 0, "currency" varchar NOT NULL DEFAULT 'USD', "active" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT 0, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_logo_kalem_catalog" PRIMARY KEY ("id"), CONSTRAINT "UQ_logo_kalem_catalog_code" UNIQUE ("code"))`);
    await q.query(`CREATE TABLE "logo_kalem_quotes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "baseNumber" varchar NOT NULL, "customerName" varchar NOT NULL, "contactName" varchar, "contactEmail" varchar, "contactPhone" varchar, "status" "public"."quotes_status_enum" NOT NULL DEFAULT 'DRAFT', "activeRevisionId" uuid, "sentAt" timestamp, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_logo_kalem_quotes" PRIMARY KEY ("id"), CONSTRAINT "UQ_logo_kalem_base_number" UNIQUE ("baseNumber"))`);
    await q.query(`CREATE TABLE "logo_kalem_quote_revisions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quoteId" uuid NOT NULL, "revisionNumber" integer NOT NULL DEFAULT 0, "language" varchar NOT NULL DEFAULT 'tr', "projectTitle" varchar NOT NULL, "subject" varchar, "meetingDate" date, "quoteDate" date NOT NULL, "senderName" varchar NOT NULL DEFAULT 'Cüneyt Ekti', "senderPhone" varchar, "senderEmail" varchar, "introduction" text, "projectScope" text, "projectTeam" text, "projectDuration" text, "paymentTerms" text, "validityTerms" text, "deliveryTerms" text, "travelTerms" text, "notes" text, "includeReferences" boolean NOT NULL DEFAULT true, "includeCertificates" boolean NOT NULL DEFAULT true, "mainTotal" numeric(14,2) NOT NULL DEFAULT 0, "maintenanceTotal" numeric(14,2) NOT NULL DEFAULT 0, "lemTotal" numeric(14,2) NOT NULL DEFAULT 0, "taxTotal" numeric(14,2) NOT NULL DEFAULT 0, "lockedAt" timestamp, "pdfSnapshot" bytea, "pdfSha256" varchar, "createdAt" timestamp NOT NULL DEFAULT now(), "updatedAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_logo_kalem_revisions" PRIMARY KEY ("id"), CONSTRAINT "UQ_logo_kalem_revision" UNIQUE ("quoteId", "revisionNumber"), CONSTRAINT "FK_logo_kalem_revision_quote" FOREIGN KEY ("quoteId") REFERENCES "logo_kalem_quotes"("id") ON DELETE CASCADE)`);
    await q.query(`ALTER TABLE "logo_kalem_quotes" ADD CONSTRAINT "FK_logo_kalem_active_revision" FOREIGN KEY ("activeRevisionId") REFERENCES "logo_kalem_quote_revisions"("id") ON DELETE SET NULL`);
    await q.query(`CREATE TABLE "logo_kalem_quote_sections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "revisionId" uuid NOT NULL, "type" varchar NOT NULL, "title" varchar NOT NULL, "currency" varchar NOT NULL DEFAULT 'USD', "billingPeriod" varchar NOT NULL DEFAULT 'ONE_TIME', "sortOrder" integer NOT NULL DEFAULT 0, "subtotal" numeric(14,2) NOT NULL DEFAULT 0, "discountTotal" numeric(14,2) NOT NULL DEFAULT 0, "netTotal" numeric(14,2) NOT NULL DEFAULT 0, CONSTRAINT "PK_logo_kalem_sections" PRIMARY KEY ("id"), CONSTRAINT "FK_logo_kalem_section_revision" FOREIGN KEY ("revisionId") REFERENCES "logo_kalem_quote_revisions"("id") ON DELETE CASCADE)`);
    await q.query(`CREATE INDEX "IDX_logo_kalem_section_order" ON "logo_kalem_quote_sections" ("revisionId", "sortOrder")`);
    await q.query(`CREATE TABLE "logo_kalem_quote_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sectionId" uuid NOT NULL, "catalogItemId" uuid, "name" varchar NOT NULL, "description" text, "location" varchar, "unit" varchar NOT NULL DEFAULT 'Adet', "currency" varchar NOT NULL DEFAULT 'USD', "userCount" numeric(12,2), "quantity" numeric(12,2) NOT NULL DEFAULT 1, "unitPrice" numeric(14,2) NOT NULL DEFAULT 0, "discountType" varchar NOT NULL DEFAULT 'NONE', "discountValue" numeric(14,2) NOT NULL DEFAULT 0, "grossTotal" numeric(14,2) NOT NULL DEFAULT 0, "discountTotal" numeric(14,2) NOT NULL DEFAULT 0, "netTotal" numeric(14,2) NOT NULL DEFAULT 0, "sortOrder" integer NOT NULL DEFAULT 0, CONSTRAINT "PK_logo_kalem_lines" PRIMARY KEY ("id"), CONSTRAINT "FK_logo_kalem_line_section" FOREIGN KEY ("sectionId") REFERENCES "logo_kalem_quote_sections"("id") ON DELETE CASCADE, CONSTRAINT "FK_logo_kalem_line_catalog" FOREIGN KEY ("catalogItemId") REFERENCES "logo_kalem_catalog_items"("id") ON DELETE SET NULL)`);
    await q.query(`CREATE INDEX "IDX_logo_kalem_line_order" ON "logo_kalem_quote_lines" ("sectionId", "sortOrder")`);
    await q.query(`CREATE TABLE "logo_kalem_quote_adjustments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "revisionId" uuid NOT NULL, "target" varchar NOT NULL, "type" varchar NOT NULL DEFAULT 'TAX', "label" varchar NOT NULL, "method" varchar NOT NULL DEFAULT 'PERCENT', "value" numeric(14,2) NOT NULL DEFAULT 0, "amount" numeric(14,2) NOT NULL DEFAULT 0, "sortOrder" integer NOT NULL DEFAULT 0, CONSTRAINT "PK_logo_kalem_adjustments" PRIMARY KEY ("id"), CONSTRAINT "FK_logo_kalem_adjustment_revision" FOREIGN KEY ("revisionId") REFERENCES "logo_kalem_quote_revisions"("id") ON DELETE CASCADE)`);
    await q.query(`CREATE INDEX "IDX_logo_kalem_adjustment_order" ON "logo_kalem_quote_adjustments" ("revisionId", "sortOrder")`);
    await q.query(`CREATE TABLE "logo_kalem_quote_activities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quoteId" uuid NOT NULL, "type" "public"."quote_activities_type_enum" NOT NULL, "status" "public"."quotes_status_enum", "note" text NOT NULL, "activityAt" timestamp NOT NULL, "createdByEmail" varchar, "createdAt" timestamp NOT NULL DEFAULT now(), CONSTRAINT "PK_logo_kalem_activities" PRIMARY KEY ("id"), CONSTRAINT "FK_logo_kalem_activity_quote" FOREIGN KEY ("quoteId") REFERENCES "logo_kalem_quotes"("id") ON DELETE CASCADE)`);
    await q.query(`CREATE INDEX "IDX_logo_kalem_activity_order" ON "logo_kalem_quote_activities" ("quoteId", "activityAt")`);
    await q.query(`INSERT INTO "logo_kalem_catalog_items" ("code","category","nameTr","unit","billingPeriod","defaultPrice","currency","sortOrder") VALUES
      ('LOGO-T3-ERP','LICENSE','LOGO TIGER 3 ERP','Lisans','ONE_TIME',3180,'USD',10),
      ('LOGO-T3-USER20','LICENSE','LOGO TIGER 3 ERP Kullanıcı Artırımı +20','Paket','ONE_TIME',15910,'USD',20),
      ('LOGO-T3-USER10','LICENSE','LOGO TIGER 3 ERP Kullanıcı Artırımı +10','Paket','ONE_TIME',8270,'USD',30),
      ('LOGO-T3-OBJECT','LICENSE','Logo Tiger 3 Object Ana Paket','Lisans','ONE_TIME',560,'USD',40),
      ('KLR-MERKEZ','RETAIL_CENTER','KL-Retail Market Modülü Merkez','Lisans','ONE_TIME',5000,'USD',100),
      ('KLR-SATINALMA','RETAIL_CENTER','KL-Retail Market Satınalma','Lisans','ONE_TIME',3000,'USD',110),
      ('KLR-CRM','RETAIL_CENTER','CRM, Müşteri Kart ve Promosyon Uygulamaları','Lisans','ONE_TIME',4000,'USD',120),
      ('KLR-MPOS','RETAIL_BRANCH','KL-Retail MPOS INT Kasa','Kasa','ONE_TIME',550,'USD',200),
      ('KLR-MPOS-CRM','RETAIL_BRANCH','KL-Retail MPOS INT Kasa CRM','Kasa','ONE_TIME',200,'USD',210),
      ('KLR-VERGI','RETAIL_BRANCH','KL-Retail MPOS Vergi Token Ek Lisansı','Kasa','ONE_TIME',275,'USD',220),
      ('KLR-BANKA','RETAIL_BRANCH','KL-Retail MPOS BankaPOS Entegrasyonu','Kasa','ONE_TIME',175,'USD',230),
      ('KLR-JMOBILE','RETAIL_BRANCH','KL-Retail Jmobile Terminal Lisansı','Terminal','ONE_TIME',750,'USD',240),
      ('KLR-SUBE','RETAIL_BRANCH','KL-Retail INT Şube Artırımı','Şube','ONE_TIME',1450,'USD',250),
      ('EGITIM-TIGER','SERVICE','Logo Tiger 3 INT Eğitimi','Adam/Gün','ONE_TIME',300,'USD',300),
      ('EGITIM-KLR','SERVICE','KL-Retail Eğitim ve Uyarlama','Adam/Gün','ONE_TIME',300,'USD',310),
      ('DANISMANLIK','SERVICE','Uyarlama, Açılış Veri Aktarımı ve Danışmanlık','Adam/Gün','ONE_TIME',375,'USD',320),
      ('BAKIM-AYLIK','MAINTENANCE','KL-Retail Bakım Destek Bedeli','Ay','MONTHLY',1500,'USD',400),
      ('LEM-YILLIK','LEM','KL-Retail LEM Bedeli','Yıl','ANNUAL',0,'USD',500)`);
  }

  public async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP TABLE "logo_kalem_quote_activities"`);
    await q.query(`DROP TABLE "logo_kalem_quote_adjustments"`);
    await q.query(`DROP TABLE "logo_kalem_quote_lines"`);
    await q.query(`DROP TABLE "logo_kalem_quote_sections"`);
    await q.query(`ALTER TABLE "logo_kalem_quotes" DROP CONSTRAINT "FK_logo_kalem_active_revision"`);
    await q.query(`DROP TABLE "logo_kalem_quote_revisions"`);
    await q.query(`DROP TABLE "logo_kalem_quotes"`);
    await q.query(`DROP TABLE "logo_kalem_catalog_items"`);
  }
}
