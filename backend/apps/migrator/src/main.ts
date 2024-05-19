import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { AppDataSource } from '@app/database/data-source';
import { rolesSeed, runSeeders, SEEDERS } from '@app/database/seeds';

type Command = 'migrate' | 'seed' | 'seed:roles' | 'all' | 'revert';

const logger = new Logger('Migrator');

const run = async (command: Command): Promise<void> => {
  await AppDataSource.initialize();
  try {
    if (command === 'migrate' || command === 'all') {
      const executed = await AppDataSource.runMigrations({ transaction: 'all' });
      logger.log(`Executed ${executed.length} migration(s)`);
    }
    if (command === 'revert') {
      await AppDataSource.undoLastMigration({ transaction: 'all' });
      logger.log('Reverted last migration');
    }
    if (command === 'seed:roles') {
      await runSeeders(AppDataSource, [rolesSeed]);
      logger.log('Roles and permissions seeded');
    }
    if (command === 'seed' || command === 'all') {
      const shouldSeedDemo = (process.env.SEED_DEMO_DATA ?? 'true') !== 'false';
      await runSeeders(AppDataSource, shouldSeedDemo ? SEEDERS : [rolesSeed]);
      logger.log(shouldSeedDemo ? 'Demo data seeded' : 'Roles and permissions seeded');
    }
  } finally {
    await AppDataSource.destroy();
  }
};

const command = (process.argv[2] ?? 'all') as Command;
run(command)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    logger.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exit(1);
  });
