import { fileURLToPath } from 'node:url';
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { UserSchema } from './entities/User.js';

export function databaseOptions(connectionString: string) {
  if (!connectionString) throw new Error('A database connection string is required.');
  return defineConfig({
    clientUrl: connectionString,
    entities: [UserSchema],
    extensions: [Migrator],
    pool: { min: 0, max: 5 },
    migrations: {
      path: fileURLToPath(new URL('./migrations', import.meta.url)),
      pathTs: fileURLToPath(new URL('./migrations', import.meta.url)),
      glob: '!(*.d).{js,ts}',
      transactional: true,
      allOrNothing: true,
    },
  });
}
