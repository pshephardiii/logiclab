import { Assignment } from './entities/Assignment.js';
import { AssignmentItem } from './entities/AssignmentItem.js';
import { Problem } from './entities/Problem.js';
import { ProblemVersion } from './entities/ProblemVersion.js';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { Enrollment } from './entities/Enrollment.js';
import { Classroom } from './entities/Classroom.js';
import { User } from './entities/User.js';
import { AuthSession } from './entities/AuthSession.js';

export function databaseOptions(
  connectionString: string,
  options: { snapshotOnMigrate?: boolean; schema?: string } = {},
) {
  if (!connectionString) throw new Error('A database connection string is required.');
  return defineConfig({
    clientUrl: connectionString,
    ...(options.schema ? { schema: options.schema } : {}),
    entities: [
      User,
      AuthSession,
      Classroom,
      Enrollment,
      Problem,
      ProblemVersion,
      Assignment,
      AssignmentItem,
    ],
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
