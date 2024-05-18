import { DataSource } from 'typeorm';

export interface Seeder {
  name: string;
  run(dataSource: DataSource): Promise<void>;
}
