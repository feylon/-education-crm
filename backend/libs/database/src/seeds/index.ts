import { DataSource } from 'typeorm';
import { demoSeed } from './demo.seed';
import { rolesSeed } from './roles.seed';
import { Seeder } from './seed.types';

export * from './seed.types';
export * from './roles.seed';
export * from './demo.seed';

export const SEEDERS: Seeder[] = [rolesSeed, demoSeed];

export const runSeeders = async (dataSource: DataSource, seeders: Seeder[] = SEEDERS): Promise<void> => {
  for (const seeder of seeders) {
    await seeder.run(dataSource);
  }
};
