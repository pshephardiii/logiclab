import { DemoWorkspace } from './entities/DemoWorkspace.ts';
import { JobSchedule } from './entities/JobSchedule.ts';
import { DurableJob } from './entities/DurableJob.ts';
import { JobRun } from './entities/JobRun.ts';
import { ReconciliationFinding } from './entities/ReconciliationFinding.ts';
import { BillingPlan } from './entities/BillingPlan.ts';
import { ClassPurchase } from './entities/ClassPurchase.ts';
import { ClassEntitlement } from './entities/ClassEntitlement.ts';
import { PaymentEvent } from './entities/PaymentEvent.ts';
import { AssignmentAttempt } from './entities/AssignmentAttempt.ts';
import { Assignment } from './entities/Assignment.ts';
import { AssignmentItem } from './entities/AssignmentItem.ts';
import { Problem } from './entities/Problem.ts';
import { ProblemVersion } from './entities/ProblemVersion.ts';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@mikro-orm/postgresql';
import { Migrator } from '@mikro-orm/migrations';
import { Enrollment } from './entities/Enrollment.ts';
import { Classroom } from './entities/Classroom.ts';
import { User } from './entities/User.ts';
import { AuthSession } from './entities/AuthSession.ts';

export function databaseOptions(
  connectionString: string,
  options: { snapshotOnMigrate?: boolean; schema?: string } = {},
) {
  if (!connectionString) throw new Error('A database connection string is required.');
  return defineConfig({
    clientUrl: connectionString,
    ...(options.schema ? { schema: options.schema } : {}),
    entities: [
      DemoWorkspace,
      User,
      AuthSession,
      Classroom,
      Enrollment,
      Problem,
      ProblemVersion,
      Assignment,
      AssignmentItem,
      AssignmentAttempt,
      BillingPlan,
      ClassPurchase,
      ClassEntitlement,
      PaymentEvent,
      JobSchedule,
      DurableJob,
      JobRun,
      ReconciliationFinding,
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
