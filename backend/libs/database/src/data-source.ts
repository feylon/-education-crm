import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './typeorm.config';

config({ path: join(process.cwd(), '.env') });
config({ path: join(process.cwd(), '..', '.env') });

export const AppDataSource = new DataSource(
  buildDataSourceOptions(process.env, [join(__dirname, 'migrations', '*.{ts,js}')]),
);
