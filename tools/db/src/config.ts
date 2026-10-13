import { fileURLToPath } from 'node:url';
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { Classroom } from './entities/Classroom.js';
import { User } from './entities/User.js';
import { AuthSession } from './entities/AuthSession.js';

export function databaseOptions(connectionString: string, options: { snapshotOnMigrate?: boolean } = {}) {
  if (!connectionString) throw new Error('A database connection string is required.');
  return defineConfig({
    clientUrl: connectionString,
    entities: [User, AuthSession, Classroom],
    extensions: [Migrator],
    pool: { min: 0, max: 5 },
    migrations: {
      path: fileURLToPath(new URL('./migrations', import.meta.url)),
      pathTs: fileURLToPath(new URL('./migrations', import.meta.url)),
      glob: '!(*.d).{js,ts}',
      transactional: true,
      allOrNothing: true,
      snapshotOnMigrate: options.snapshotOnMigrate ?? true,
    },
  });
}
