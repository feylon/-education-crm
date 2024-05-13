import { DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';

export interface DatabaseEnv {
  POSTGRES_HOST?: string;
  POSTGRES_PORT?: string | number;
  POSTGRES_USER?: string;
  POSTGRES_PASSWORD?: string;
  POSTGRES_DB?: string;
  POSTGRES_SSL?: string | boolean;
  NODE_ENV?: string;
}

export const buildDataSourceOptions = (env: DatabaseEnv, migrations: (string | Function)[] = []): DataSourceOptions => ({
  type: 'postgres',
  host: env.POSTGRES_HOST ?? 'localhost',
  port: Number(env.POSTGRES_PORT ?? 5432),
  username: env.POSTGRES_USER ?? 'postgres',
  password: env.POSTGRES_PASSWORD ?? 'postgres',
  database: env.POSTGRES_DB ?? 'education_crm',
  ssl: env.POSTGRES_SSL === true || env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: ENTITIES,
  migrations,
  synchronize: false,
  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  migrationsTableName: 'typeorm_migrations',
});
