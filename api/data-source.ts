import 'reflect-metadata';
import { DataSource } from 'typeorm';

/**
 * TypeORM CLI için (migration:generate / migration:run).
 * Kullanım:
 *   DATABASE_URL=postgres://... npm run migration:generate
 *   DATABASE_URL=postgres://... npm run migration:run
 * Üretimde DB_SYNCHRONIZE=false yapıp migration'larla ilerleyin.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgres://cmanage:cmanage@localhost:5432/cmanage',
  entities: ['src/entities/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
});
